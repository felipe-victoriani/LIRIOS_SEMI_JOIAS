// Config pública do Firebase Web SDK — NÃO é segredo (identificador do projeto),
// a proteção real vem das regras em database.rules.json. Pode ficar commitada.
//
// Como preencher:
// 1. console.firebase.google.com → crie um projeto "lirio-semijoias" (ou o nome que preferir).
// 2. Ative Realtime Database (modo produção) e Authentication → método E-mail/senha.
// 3. Configurações do projeto → Seus apps → Adicionar app → Web (</>) → copie o objeto abaixo.
// 4. Em Authentication → Users, crie o usuário admin (seu e-mail) que vai logar em admin/login.html.
// 5. Publique o conteúdo de database.rules.json em Realtime Database → Regras → Publicar.
export const firebaseConfig = {
  apiKey: "COLE_AQUI_SUA_API_KEY",
  authDomain: "COLE_AQUI_SEU_PROJETO.firebaseapp.com",
  databaseURL: "https://COLE_AQUI_SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId: "COLE_AQUI_SEU_PROJETO",
  storageBucket: "COLE_AQUI_SEU_PROJETO.appspot.com",
  messagingSenderId: "COLE_AQUI_SEU_SENDER_ID",
  appId: "COLE_AQUI_SEU_APP_ID",
};
