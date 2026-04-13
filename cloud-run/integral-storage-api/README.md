# Integral Storage API

Microservicio para Cloud Run que guarda archivos en `Google Cloud Storage` usando la service account adjunta al servicio.

## Variables requeridas

- `GCS_BUCKET_NAME`
- `UPLOAD_API_SECRET`

## Variables opcionales

- `ALLOWED_ORIGIN`
- `MAX_UPLOAD_SIZE_MB`

## Endpoints

- `GET /health`
- `POST /upload`
- `GET /objects/content`
- `DELETE /objects`

## Ejemplo de upload

```bash
curl -X POST "https://SERVICE_URL/upload" \
  -H "x-upload-secret: TU_SECRETO" \
  -F "file=@C:/ruta/archivo.pdf" \
  -F "folder=control-pagos" \
  -F "projectId=uuid-del-proyecto" \
  -F "recordId=uuid-del-registro"
```

## Deploy en Cloud Run

```bash
gcloud run deploy integral-storage-api \
  --source cloud-run/integral-storage-api \
  --region southamerica-west1 \
  --allow-unauthenticated \
  --service-account integral-storage-sa@manso-492902.iam.gserviceaccount.com \
  --build-service-account projects/manso-492902/serviceAccounts/integral-build-sa@manso-492902.iam.gserviceaccount.com \
  --set-env-vars "GCS_BUCKET_NAME=gestion-integral-prod" \
  --set-env-vars "MAX_UPLOAD_SIZE_MB=25" \
  --update-secrets UPLOAD_API_SECRET=integral-upload-secret:latest
```

## Nota

Este servicio queda publico a nivel de red para que Render pueda invocarlo, pero protegido por `UPLOAD_API_SECRET`. Si mas adelante migran el backend principal a Google Cloud o habilitan Workload Identity Federation desde el hosting externo, podemos cerrar esa exposicion y pasar a autenticacion IAM real.
