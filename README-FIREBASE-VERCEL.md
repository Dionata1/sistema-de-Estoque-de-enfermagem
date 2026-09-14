# Firebase CEET + Vercel

## Projeto
- Firebase project: `ceet-enfermagem`
- Firestore database: `ai-studio-sistemadeestoque-88380e33-6bc2-46f4-bbf2-12ad99eb524f`

## Credencial administrativa
Nunca coloque a Service Account no GitHub.

### Vercel
Crie estas Environment Variables:
- `FIREBASE_SERVICE_ACCOUNT`: JSON completo de uma Service Account NOVA do projeto `ceet-enfermagem`.
- `JWT_SECRET`: segredo longo e aleatório.

### Local
PowerShell:
```powershell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content "C:\caminho\firebase-service-account.json" -Raw
npm install
npm run dev
```

O backend usa Firebase Admin SDK para Firestore e Authentication. O cliente Web continua usando `firebase-applet-config.json`.
