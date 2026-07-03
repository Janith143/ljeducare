'use server';

import { revalidatePath } from 'next/cache';
import { COLLECTIONS } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export interface StudentProfileInput {
    firstName: string;
    lastName: string;
    contactNumber: string;
    guardianPhone: string;
    guardianEmail: string;
    school: string;
    preferredCurrency: string;
}

/** A student updates their own profile (role/enrollments/email stay server-owned). */
export async function updateStudentProfileAction(input: StudentProfileInput) {
    const user = await requireRole('student');
    if (!input.firstName.trim() || !input.lastName.trim()) {
        return { error: 'First and last name are required.' };
    }
    await adminDb().collection(COLLECTIONS.USERS).doc(user.uid).set(
        {
            firstName: input.firstName.trim().slice(0, 60),
            lastName: input.lastName.trim().slice(0, 60),
            contactNumber: input.contactNumber.trim().slice(0, 20),
            guardianPhone: input.guardianPhone.trim().slice(0, 20),
            guardianEmail: input.guardianEmail.trim().slice(0, 120),
            schools: input.school.trim() ? [input.school.trim().slice(0, 120)] : [],
            preferredCurrency: input.preferredCurrency,
        },
        { merge: true },
    );
    revalidatePath('/student/profile');
    return { ok: true };
}
