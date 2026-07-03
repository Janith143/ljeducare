/**
 * submitQuiz (callable) — grades a student's quiz attempt SERVER-SIDE.
 * The client never sees isCorrect flags (public payloads strip questions);
 * grading against the Firestore quiz doc is the only trusted path.
 * One attempt per student: submissions doc id = {quizId}_{uid}.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');

const submitQuiz = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid || request.auth.token.role !== 'student') {
        throw new HttpsError('permission-denied', 'Student sign-in required');
    }
    const { quizId, answers } = request.data || {};
    if (!quizId || !Array.isArray(answers)) {
        throw new HttpsError('invalid-argument', 'quizId and answers are required');
    }

    const db = getFirestore();
    const [quizDoc, studentDoc] = await Promise.all([
        db.collection('quizzes').doc(String(quizId)).get(),
        db.collection('users').doc(uid).get(),
    ]);
    if (!quizDoc.exists || quizDoc.data().isDeleted) throw new HttpsError('not-found', 'Quiz not found');
    const quiz = quizDoc.data();
    const student = studentDoc.data() || {};

    const isFree = quiz.pricing?.isFree || !(quiz.pricing?.basePrice > 0);
    const enrolled = (student.enrolledQuizIds || []).map(String).includes(String(quizId));
    if (!isFree && !enrolled) {
        throw new HttpsError('permission-denied', 'Enroll in this quiz before taking it.');
    }

    const submissionRef = db.collection('submissions').doc(`${quizId}_${uid}`);
    if ((await submissionRef.get()).exists) {
        throw new HttpsError('already-exists', 'You have already submitted this quiz.');
    }

    // Grade: a question scores when the selected set EXACTLY matches the correct set.
    const byQuestion = new Map(answers.map((a) => [String(a.questionId), a.selectedAnswerIds || []]));
    let score = 0;
    const total = (quiz.questions || []).length;
    for (const question of quiz.questions || []) {
        const correct = (question.answers || []).filter((a) => a.isCorrect).map((a) => String(a.id)).sort();
        const selected = (byQuestion.get(String(question.id)) || []).map(String).sort();
        if (correct.length && correct.length === selected.length && correct.every((id, i) => id === selected[i])) {
            score++;
        }
    }

    await submissionRef.set({
        id: submissionRef.id,
        studentId: uid,
        quizId: String(quizId),
        quizTitle: quiz.title || '',
        teacherId: quiz.teacherId || null,
        answers: answers.map((a) => ({
            questionId: String(a.questionId),
            selectedAnswerIds: (a.selectedAnswerIds || []).map(String),
        })),
        score,
        total,
        submittedAt: new Date().toISOString(),
    });

    return { score, total };
});

module.exports = { submitQuiz };
