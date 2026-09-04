# Spider Birthday — Site de aniversário infantil

Site de aniversário infantil com identidade visual própria inspirada em aventura (teias SVG/CSS e balões). **Sem imagens oficiais copyrightadas.**

## Tecnologias

- **Backend:** Java 21, Spring Boot 3.4, Spring Web, Spring Data JPA, PostgreSQL, Flyway, Bean Validation, WebSocket/STOMP, Lombok, OpenAPI/Swagger (Tomcat embutido)
- **Frontend:** Angular 21, TypeScript, SCSS, Angular Animations, RxJS (mobile first)
- **Infra local:** Docker Compose (PostgreSQL 16)

## Requisitos

- Java 21 (`JAVA_HOME` apontando para o JDK)
- Maven 3.8+
- Node.js 20+ e npm
- Docker Desktop (para o Postgres)
- Angular CLI 21 (opcional; o projeto já traz scripts npm)

## Estrutura

```
C:\spider-birthday\
├── README.md
├── docker-compose.yml
├── .vscode\          # Maven settings do workspace (não altera ~/.m2)
├── scripts\          # atalhos PowerShell do backend
├── backend\
└── frontend\
```

## Maven neste repo (importante)

Se o `~/.m2/settings.xml` global apontar para mirror corporativo (`repo.in.local` / `in-all`), use **sempre** os settings locais deste projeto — **não** sobrescreva o settings global.

| Forma | Como |
|---|---|
| IDE (Cursor/VS Code) | Abra a pasta raiz do repo. O `.vscode/settings.json` já aponta `java.configuration.maven.userSettings` e `maven.userSettings` para `backend/maven-settings.xml`. Depois: Command Palette → **Java: Clean Java Language Server Workspace** (ou **Maven: Update Project**) e recarregue a janela. |
| Wrapper CMD | `backend\mvn.cmd compile` / `backend\mvn.cmd spring-boot:run` |
| Scripts PowerShell | `.\scripts\backend-build.ps1` / `.\scripts\backend-run.ps1` |
| Manual | `cd backend` e `mvn -s maven-settings.xml -U …` |

> `backend/maven-settings.xml` força Maven Central (`mirrorOf *`). O `~/.m2/settings.xml` global permanece intacto para outros projetos.

## Como rodar

### 1) PostgreSQL

Na raiz do projeto:

```bash
docker compose up -d
```

Credenciais padrão:

- DB: `aniversario`
- User: `aniversario`
- Password: `aniversario`
- Porta: `5432`

### 2) Backend

Preferível (PowerShell, na raiz):

```powershell
.\scripts\backend-run.ps1
```

Ou via wrapper:

```bat
cd backend
mvn.cmd spring-boot:run
```

Equivalente manual:

```bash
cd backend
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot
mvn -s maven-settings.xml -U spring-boot:run
```

API: `http://localhost:8080`  
Swagger: `http://localhost:8080/swagger-ui.html`

### 3) Frontend

```bash
cd frontend
npm install
npm start
```

App: `http://localhost:4200` (proxy para `/api`, `/uploads` e `/ws`)

## Variáveis de ambiente (backend)

| Variável | Padrão | Descrição |
|---|---|---|
| `APP_ADMIN_TOKEN` | `troque-este-token` | Token do admin (`X-Admin-Token`) |
| `APP_CORS_ORIGINS` | `http://localhost:4200` | Origens CORS (separadas por vírgula) |
| `APP_UPLOAD_DIR` | `uploads` | Pasta local de fotos (legado e fallback sem Cloudinary) |
| `APP_PUBLIC_BASE_URL` | `http://localhost:8080/uploads` | URL pública das fotos locais |
| `CLOUDINARY_CLOUD_NAME` | _(vazio)_ | Cloud name do Cloudinary. Se as 3 vars estiverem preenchidas, uploads novos vão para a nuvem |
| `CLOUDINARY_API_KEY` | _(vazio)_ | API key do Cloudinary |
| `CLOUDINARY_API_SECRET` | _(vazio)_ | API secret do Cloudinary (não commitar) |
| `CLOUDINARY_FOLDER` | `spider-birthday` | Pasta no Cloudinary |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/aniversario` | JDBC |
| `SPRING_DATASOURCE_USERNAME` | `aniversario` | Usuário DB |
| `SPRING_DATASOURCE_PASSWORD` | `aniversario` | Senha DB |

Exemplo (PowerShell):

```powershell
$env:APP_ADMIN_TOKEN = "segredo-forte"
$env:CLOUDINARY_CLOUD_NAME = "seu-cloud"
$env:CLOUDINARY_API_KEY = "sua-key"
$env:CLOUDINARY_API_SECRET = "seu-secret"
.\scripts\backend-run.ps1
```

Sem as 3 variáveis Cloudinary, o backend usa disco local (`uploads/`) — `mvn spring-boot:run` continua funcionando.

Há um `.env.example` na raiz com os nomes das variáveis (sem segredos).

## Configuração da festa

Edite os placeholders em:

- Backend: `backend/src/main/resources/party-config.yml`
- Frontend (fallback): `frontend/public/assets/party-config.json`

Placeholders: `[NOME_DA_CRIANCA]`, `[IDADE]`, `[DATA_DA_FESTA]`, `[HORARIO]`, `[LOCAL]`, `[ENDERECO]`, `[LINK_GOOGLE_MAPS]`

Para o countdown funcionar, use data real no formato `DD/MM/AAAA` ou `AAAA-MM-DD` e horário `HH:MM`.

## WhatsApp após confirmação

Após confirmar presença (RSVP), o site oferece enviar uma mensagem pré-preenchida via WhatsApp.

### Configuração

1. Edite o número em **`backend/src/main/resources/party-config.yml`** → campo `whatsapp-number`
2. Edite também em **`frontend/public/assets/party-config.json`** → campo `whatsappNumber`
3. Formato: DDI+DDD+número (ex.: `351913154440` ou `+351 913 154 440`). O site remove caracteres não numéricos antes de abrir o `wa.me`.

### Comportamento

- Após o POST de confirmação, o site abre `wa.me/<numero>` com mensagem pré-preenchida (nome, adultos, crianças)
- O usuário confirma o envio no WhatsApp (o site **não** envia automaticamente)
- Se o número ainda for placeholder (contiver `[`), o WhatsApp **não** é aberto
- A mensagem usa **formatação nativa do WhatsApp** (`*negrito*`, quebras de linha e emojis). **HTML/CSS não funciona** em `wa.me` e apareceriam como texto cru no chat.
## Lista de heróis (convidados)

Rota pública: [`/convidados`](http://localhost:4200/convidados)

Exibe os convidados confirmados em **lista rolável** (não em cards), com totais de pessoas, adultos, crianças e grupos. Dados vêm de `GET /api/rsvp/confirmados` (sem telefone).

### Imprimir

No topo da página, use **Imprimir lista**. O navegador abre a caixa de impressão; o CSS de impressão esconde header, FAB e botões e mostra a lista completa (sem scroll).

## Storage de fotos e stories

- Interface: `FileStorageService`
- **Cloudinary** se `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` estiverem definidas; senão **disco local** (`LocalFileStorageService`, pasta `uploads/`)
- Uploads novos no Cloudinary: pasta `spider-birthday`, URL HTTPS em `foto.url`; `nomeArquivo` guarda o `public_id` (com `resource_type`)
- Arquivos antigos em `/uploads/**` continuam sendo servidos pelo `WebConfig` (não são migrados automaticamente)
- Upload: JPEG/PNG/WEBP até **10 MB**; MP4/WEBM até **50 MB**
- Destino no envio: **mural** (permanente) ou **stories** (some da faixa **7 dias após a aprovação**)
- Mídias nascem com `aprovada=false`
- Público: `GET /api/fotos` (mural aprovado) e `GET /api/stories` (stories aprovados e ainda válidos)
- WebSocket `/topic/fotos` publica **somente após aprovação** (o front separa mural e stories pelo `tipo`)
- Admin: `GET /api/admin/fotos/{id}/download` baixa o arquivo original (`X-Admin-Token`)
- Revista HQ usa só **imagens** aprovadas (vídeo não vira painel)
- Rotas: mural + stories em `/fotos`, revista em `/hq`

### Instagram

A API oficial **não** entrega stories de outras pessoas que marcaram o perfil do aniversariante. O mural pede para marcar o Instagram **e** enviar a foto no site.

Configure o handle em `party-config.yml` (`instagram-handle`) e `party-config.json` (`instagramHandle`), ex.: `samuel.aranha`.

### Revista HQ

No `/admin`, seção **Revista HQ**: escolha fotos aprovadas, layout (1/2/3 painéis) e legendas. Visitantes leem em `/hq`.

- Público: `GET /api/hq`
- Admin: `GET/POST /api/admin/hq/paginas`, `PUT/DELETE /api/admin/hq/paginas/{id}`

## WebSocket

- Endpoint: `/ws` (SockJS)
- Tópico: `/topic/fotos`
- Cliente Angular: `PhotoWebSocketService`

## Presentes

- Endpoint público: `GET /api/presentes`
- Seed Flyway `V2` com 3 presentes de exemplo

## Admin

- Rota: `/admin`
- Autenticação: header `X-Admin-Token` = `APP_ADMIN_TOKEN`
- Endpoints:
  - `GET /api/admin/dashboard`
  - `GET /api/admin/fotos` (todas as mídias, inclusive stories expirados)
  - `GET /api/admin/fotos/imagens` (imagens aprovadas do mural, para a HQ)
  - `GET /api/admin/fotos/{id}/download`
  - `PATCH /api/admin/fotos/{id}/aprovar`
  - `DELETE /api/admin/fotos/{id}`
  - `DELETE /api/fotos/{id}` (também exige token)
  - `GET/POST /api/admin/hq/paginas`
  - `PUT/DELETE /api/admin/hq/paginas/{id}`

## Build de produção

### Backend

```powershell
.\scripts\backend-build.ps1
java -jar backend\target\spider-birthday-1.0.0.jar
```

Ou: `cd backend` e `mvn.cmd -DskipTests package`.

### Frontend

```bash
cd frontend
npm run build
```

Artefatos em `frontend/dist/frontend/browser` (sirva com nginx ou similar apontando `/api` e `/ws` para o backend).

## Principais endpoints

- `POST/GET /api/rsvp`
- `GET /api/party`
- `GET /api/presentes`
- `POST/GET /api/fotos`
- `GET /api/stories`
- `GET /api/hq`
- Admin conforme seção acima
