-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "name" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchRun" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "parentRunId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL,
    "effectiveQuery" TEXT NOT NULL,
    "filtersJson" JSONB NOT NULL,
    "requestedCount" INTEGER NOT NULL DEFAULT 100,
    "retrievedCount" INTEGER NOT NULL DEFAULT 0,
    "scoredCount" INTEGER NOT NULL DEFAULT 0,
    "unscorableCount" INTEGER NOT NULL DEFAULT 0,
    "dedupClusterCount" INTEGER NOT NULL DEFAULT 0,
    "similarContentPct" DOUBLE PRECISION,
    "similarityMethod" TEXT,
    "similarityThreshold" DOUBLE PRECISION,
    "coverageStart" TIMESTAMP(3),
    "coverageEnd" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "averageTopicMatch" DOUBLE PRECISION,
    "relevantPostsPct" DOUBLE PRECISION,
    "aiProvider" TEXT,
    "aiModel" TEXT,
    "aiConfigVersion" TEXT,
    "scoringRubricVersion" TEXT NOT NULL DEFAULT 'v1',
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',

    CONSTRAINT "SearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectedPost" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorHandle" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isTruncated" BOOLEAN NOT NULL DEFAULT false,
    "missingFields" JSONB,
    "language" TEXT,
    "url" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "isRepost" BOOLEAN NOT NULL DEFAULT false,
    "isReply" BOOLEAN NOT NULL DEFAULT false,
    "engagementJson" JSONB,
    "engagementCollectedAt" TIMESTAMP(3),
    "translatedFrom" TEXT,
    "originalText" TEXT,
    "duplicateClusterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateCluster" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "representativeText" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DuplicateCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelevanceScore" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "score" INTEGER,
    "explanation" TEXT,
    "isScorable" BOOLEAN NOT NULL DEFAULT true,
    "unscorableReason" TEXT,

    CONSTRAINT "RelevanceScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportVersion" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "themesJson" JSONB NOT NULL,
    "keyTakeawaysJson" JSONB NOT NULL,
    "disagreementsJson" JSONB NOT NULL,
    "questionsJson" JSONB NOT NULL,
    "representativePostsJson" JSONB NOT NULL,
    "limitations" TEXT NOT NULL,
    "minRelevanceFilter" INTEGER,
    "scoredPostCount" INTEGER NOT NULL,
    "filteredPostCount" INTEGER,
    "generatedByProvider" TEXT NOT NULL,
    "generatedByModel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "searchId" TEXT,
    "runId" TEXT,
    "userId" TEXT,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XConnectionSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'x_api_v2',
    "encryptedCredentials" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_configured',
    "savedAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResultJson" JSONB,
    "configVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "XConnectionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConfiguration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ollama_cloud',
    "encryptedApiKey" TEXT,
    "maskedKeyHint" TEXT,
    "model" TEXT,
    "endpointOverride" TEXT,
    "temperature" DOUBLE PRECISION,
    "maxOutputTokens" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'not_configured',
    "savedAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResultJson" JSONB,
    "configVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AIConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Search_userId_idx" ON "Search"("userId");

-- CreateIndex
CREATE INDEX "SearchRun_searchId_idx" ON "SearchRun"("searchId");

-- CreateIndex
CREATE INDEX "SearchRun_status_idx" ON "SearchRun"("status");

-- CreateIndex
CREATE INDEX "CollectedPost_runId_idx" ON "CollectedPost"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectedPost_runId_postId_key" ON "CollectedPost"("runId", "postId");

-- CreateIndex
CREATE INDEX "DuplicateCluster_runId_idx" ON "DuplicateCluster"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "RelevanceScore_postId_key" ON "RelevanceScore"("postId");

-- CreateIndex
CREATE INDEX "RelevanceScore_runId_idx" ON "RelevanceScore"("runId");

-- CreateIndex
CREATE INDEX "ReportVersion_runId_idx" ON "ReportVersion"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportVersion_runId_version_key" ON "ReportVersion"("runId", "version");

-- CreateIndex
CREATE INDEX "AuditEvent_searchId_idx" ON "AuditEvent"("searchId");

-- CreateIndex
CREATE INDEX "AuditEvent_runId_idx" ON "AuditEvent"("runId");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_idx" ON "AuditEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "XConnectionSettings_userId_key" ON "XConnectionSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AIConfiguration_userId_key" ON "AIConfiguration"("userId");

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchRun" ADD CONSTRAINT "SearchRun_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectedPost" ADD CONSTRAINT "CollectedPost_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectedPost" ADD CONSTRAINT "CollectedPost_duplicateClusterId_fkey" FOREIGN KEY ("duplicateClusterId") REFERENCES "DuplicateCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCluster" ADD CONSTRAINT "DuplicateCluster_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelevanceScore" ADD CONSTRAINT "RelevanceScore_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelevanceScore" ADD CONSTRAINT "RelevanceScore_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CollectedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportVersion" ADD CONSTRAINT "ReportVersion_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SearchRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XConnectionSettings" ADD CONSTRAINT "XConnectionSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConfiguration" ADD CONSTRAINT "AIConfiguration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
