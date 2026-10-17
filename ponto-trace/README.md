# Ponto Trace EMEC — servidor (parte 1)

Next.js + Postgres. Login com Argon2id e JWT em cookie httpOnly; perfis verificados no servidor a cada requisição;
retirada/devolução em transação atômica; auditoria e movimentações imutáveis (o banco recusa alterar ou apagar).

## Publicar (sem instalar nada no seu computador)
1. Crie conta no **GitHub** e envie esta pasta (New repository > Upload files).
2. Crie conta no **Neon** (neon.tech), crie um projeto e copie a *connection string* (DATABASE_URL).
3. Crie conta na **Vercel** com o GitHub, **Add New > Project**, escolha o repositório e, antes de Deploy, preencha em *Environment Variables*:
   DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD, SETUP_KEY (veja .env.example).
4. Depois do deploy, abra `https://SEU-SITE.vercel.app/api/setup?key=SUA_SETUP_KEY` uma vez.
5. Apague a variável SETUP_KEY na Vercel e faça Redeploy.

## Rotas desta etapa
POST /api/login · GET, POST /api/tools · POST /api/move ({code, action: withdraw|return, registration, notes, condition})

## Etapa 2
A interface fica em public/app.html (a página inicial redireciona para ela). Depois do setup, entre com o usuário `admin` e a senha que você definiu em ADMIN_PASSWORD. Crie as caixas, os funcionários e as ferramentas reais pelo próprio sistema.
