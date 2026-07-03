# Firebase Emulator Suite in a container.
# Why: the Java-based Firestore emulator needs AF_UNIX sockets, which some
# Windows machines/security suites block — Linux containers are immune.
FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g firebase-tools@14

WORKDIR /app

# Pre-download emulator jars into the image for fast startup.
RUN firebase setup:emulators:firestore && firebase setup:emulators:storage

EXPOSE 4000 5001 8080 9099 9199

CMD ["firebase", "emulators:start", "--project", "demo-ljeducare"]
