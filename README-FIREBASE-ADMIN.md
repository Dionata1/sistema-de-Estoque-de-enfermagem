

## Firebase Admin - credencial protegida

A Service Account **não fica dentro deste projeto**. O backend procura a credencial nesta ordem:
1. `FIREBASE_SERVICE_ACCOUNT`
2. `GOOGLE_APPLICATION_CREDENTIALS`
3. `%APPDATA%\CEET-Estoque\firebase-service-account.json`

Para configurar no Windows, execute no PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\configurar-firebase-admin.ps1
```

O script copia o JSON para `%APPDATA%\CEET-Estoque`, fora da pasta do projeto, e configura `GOOGLE_APPLICATION_CREDENTIALS` para o usuário.

**Nunca envie a Service Account ao GitHub, Vercel ou dentro do ZIP do projeto.** Se uma chave privada foi exposta, revogue-a e gere uma nova.
