<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/88380e33-6bc2-46f4-bbf2-12ad99eb524f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Firebase CEET
Este projeto está configurado para o projeto Firebase `ceet-enfermagem`. O cadastro de servidores usa Firebase Authentication e Firestore. Operações administrativas no Authentication (alteração de senha/status) exigem credencial Firebase Admin no backend via `FIREBASE_SERVICE_ACCOUNT` ou `GOOGLE_APPLICATION_CREDENTIALS`. **Nunca publique a chave privada no frontend, Git ou chat.**


## Firebase Admin local

O arquivo `firebase-service-account.json` está incluído apenas para execução local e já está no `.gitignore`. Não publique esse arquivo no GitHub, Vercel ou Render.
