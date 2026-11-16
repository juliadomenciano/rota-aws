# Rota AWS

App de estudos para a certificação AWS Certified Solutions Architect – Associate (SAA-C03). Inclui:

- **Estudo:** hoje, pomodoro, trilha com as 19 seções do curso em 8 fases (planejado × realizado) e aulas.
- **Questões:** questão do dia, simulados (por domínio, aula, serviço, misto e modo prova real com 65 questões em 130 minutos) e caderno de erros.
- **Revisão:** revisão espaçada das aulas e flashcards em caixas de Leitner.
- **Lembretes:** no Android.
- **Módulos opcionais:** desempenho, patentes e conquistas.

Um mesmo código gera duas versões:

- **PWA** para o PC, publicado no GitHub Pages e instalável pelo Chrome ou pelo Edge.
- **APK Android**, feito com Capacitor, com notificação no fim de cada etapa do pomodoro mesmo com a tela bloqueada.

Os dados ficam no Supabase, na tabela `aws_docs`, dentro do mesmo projeto do Missão PF (prefixo próprio e RLS por usuário). Sem configuração ou sem internet, o app funciona e guarda tudo no aparelho. Quando a conexão volta, ele sincroniza.

## 1. Supabase

A tabela já foi criada no projeto `missao-pf` com o arquivo `supabase/schema.sql` (tabela, políticas de RLS e realtime). Para recriar em outro projeto, rode esse arquivo no SQL Editor.

O login usa o mesmo e-mail e senha do Missão PF, porque o projeto Supabase é o mesmo.

## 2. Rodar no PC

```bash
cp .env.example .env
npm install
npm run dev
```

Preencha o `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Para desenvolver, deixe `VITE_AULAS_URL` vazio.

## 3. GitHub

1. Crie um repositório público chamado `rota-aws` (GitHub Pages em repositório privado exige plano pago). A chave publishable do Supabase é pública por natureza, porque quem protege os dados é o RLS.
2. Em **Settings > Secrets and variables > Actions**, crie os secrets `ANDROID_KEYSTORE_B64` e `ANDROID_KEYSTORE_PASSWORD`, conforme o passo 4.
3. Em **Settings > Pages**, escolha **Source: GitHub Actions**.
4. Faça o push para `main`. Dois workflows rodam:
   - **PWA no GitHub Pages** publica o site;
   - **APK Android** gera o APK assinado e publica uma release `v1.0.N` com o arquivo `rota-aws.apk`.

## 4. Assinatura do APK (recomendado)

Sem keystore, o workflow gera um APK de debug com uma assinatura diferente a cada build. Nesse caso, para atualizar o app, você precisa desinstalar a versão antiga primeiro. Com uma keystore fixa, as atualizações instalam por cima.

Crie a keystore uma vez e guarde o arquivo e a senha em um lugar seguro:

```bash
keytool -genkeypair -v -keystore rota-aws.keystore -alias rotaaws \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 rota-aws.keystore
```

Use a mesma senha para a store e para a chave. Depois, crie os secrets:

- `ANDROID_KEYSTORE_B64`: a saída do comando `base64`;
- `ANDROID_KEYSTORE_PASSWORD`: a senha.

## 5. Instalar no Android

1. No celular, abra https://github.com/juliadomenciano/rota-aws/releases/latest/download/rota-aws.apk. Esse link sempre baixa a versão mais nova.
2. Abra o arquivo e permita instalar de fontes desconhecidas quando o Android pedir. Para atualizar, baixe pelo mesmo link e instale por cima.
3. Na primeira vez que iniciar o pomodoro, permita as notificações.

Se o aviso do timer atrasar com o celular parado, desative a otimização de bateria para o app em **Configurações > Apps > Rota AWS > Bateria > Sem restrições**.

## 6. Aulas novas

As aulas não ficam presas no APK. Para publicar uma aula nova:

1. Crie o arquivo `public/aulas/<id>.html` seguindo o formato de `public/aulas/aws-01.html`:
   - seções `<section data-sec="Nome">` dentro de `<article>`;
   - checks, flashcards, situações e banco de questões no `<script type="application/json" class="aula-data">`.
2. Adicione a aula em `public/aulas/index.json` (com `materia` igual ao id da seção do curso, ex.: `s07`).
3. Faça commit e push.

Formato de cada questão no JSON:

```json
{ "e": "enunciado", "o": ["A", "B", "C", "D"], "g": [2], "x": ["por que A", "por que B", "por que C", "por que D"], "sv": ["S3"], "d": "cus" }
```

- `g` é a lista de alternativas corretas (mais de uma = múltipla resposta);
- `d` é o domínio: `seg` (Segura), `res` (Resiliente), `des` (Alto desempenho) ou `cus` (Custo otimizado).

O GitHub Pages atualiza, e tanto o PC quanto o APK buscam as aulas de lá. Cada aula aberta fica guardada para uso offline. A cópia embutida no APK serve de reserva.

## Estrutura

```
index.html            markup das telas
src/main.js           base do app: menu, trilha, pomodoro, aulas, login e configurações
src/quest.js          banco de questões, questão do dia, simulados, modo prova real e caderno de erros
src/revisao.js        revisão espaçada, flashcards e lembretes
src/extras.js         desempenho, patentes e conquistas
src/plano.js          meu plano
src/sync.js           sincronização com o Supabase (offline-first, realtime)
src/native.js         notificações, status bar e botão voltar no Android
src/lessons.js        carregamento das aulas (remoto → embutido → cache)
src/style.css         tema escuro
public/aulas/         catálogo e aulas
supabase/schema.sql   tabela + RLS + realtime
android/              projeto Android (Capacitor)
```

Para gerar o APK localmente com Android Studio, rode `npm run build:android` e depois `npx cap open android`.
