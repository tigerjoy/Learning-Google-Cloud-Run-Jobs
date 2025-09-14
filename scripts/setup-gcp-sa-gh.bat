@echo off
REM === Replace with your project ID ===
set PROJECT_ID=chat-history-4cc0b

REM === Create service account ===
echo Creating service account...
CALL gcloud iam service-accounts create github-actions --description="Deploy Cloud Run Jobs from GitHub Actions" --display-name="GitHub Actions Deployer"

REM === Grant roles ===
echo Granting roles...
CALL gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:github-actions@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/run.admin"

CALL gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:github-actions@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/artifactregistry.admin"

CALL gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:github-actions@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/iam.serviceAccountUser"

REM === Generate key.json in current folder ===
echo Creating service account key file key.json...
CALL gcloud iam service-accounts keys create key.json --iam-account=github-actions@%PROJECT_ID%.iam.gserviceaccount.com

echo ==========================================
echo Service account setup complete!
echo key.json has been saved in %cd%
echo Upload this JSON to GitHub Secrets as GCP_SA_KEY
echo ==========================================
pause