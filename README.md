# Master | Gestor de Projetos

Aplicação web estática em HTML, CSS e JavaScript para GitHub Pages, usando Supabase para autenticação, banco de dados e Storage.

## O que esta versão contempla

- Login obrigatório por e-mail e senha via Supabase Auth.
- Todos os usuários autenticados possuem o mesmo acesso aos projetos.
- Cadastro e edição de projetos.
- Status, prioridade, progresso, início, entrega e conclusão automática.
- Categoria, tags e cor de destaque do projeto.
- Quadro por status.
- Linha do tempo do portfólio.
- Dashboard com indicadores e próximos prazos.
- Arquivos associados armazenados em bucket privado do Supabase.
- Links externos associados ao projeto.
- Data/hora de última alteração (`updated_at`).
- Sem campo de criador/responsável no modelo atual.

## 1. Configurar o Supabase

### Projeto novo

No SQL Editor, execute `schema.sql`.

### Projeto que já recebeu o modelo anterior

Execute `migrate_v3.sql` uma única vez. A migração preserva os projetos existentes e adiciona os campos atuais.

## 2. Autenticação

Em **Authentication > Providers**, mantenha Email habilitado.

Como o site é interno, é recomendado desabilitar o cadastro público em **Authentication > Settings** e criar os usuários manualmente em **Authentication > Users**.

Você pode usar **Add user > Send invitation** para cada pessoa do setor.

## 3. URL e chave

Em **Connect** ou **Settings > API Keys**, copie:

- Project URL
- Publishable key (`sb_publishable_...`)

Edite `config.js`:

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseKey: 'sb_publishable_...'
};
```

Nunca coloque uma `sb_secret_...` no projeto do GitHub Pages.

## 4. Storage

O SQL cria o bucket privado `project-files` com limite de 50 MB por arquivo e políticas para usuários autenticados.

O site envia os arquivos para:

```text
project-files/<id-do-projeto>/<timestamp>-<nome-do-arquivo>
```

Para arquivos, o banco registra os metadados na tabela `project_attachments`. Para links, guarda apenas a URL.

## 5. Rodar localmente

Como o app usa módulos/recursos do navegador e callback de autenticação, abra por um servidor local em vez de `file://`.

Exemplo com Python:

```bash
python -m http.server 5500
```

Depois acesse:

```text
http://localhost:5500/
```

Adicione essa URL em **Authentication > URL Configuration** do Supabase para os fluxos de recuperação de senha.

## 6. Publicar no GitHub Pages

Suba todos os arquivos para um repositório e habilite:

**Settings > Pages > Source: GitHub Actions**

O workflow já está incluído em `.github/workflows/deploy.yml`.

## Estrutura

```text
.
├── index.html
├── styles.css
├── app.js
├── config.js
├── schema.sql
├── migrate_v3.sql
├── assets/
│   ├── master-logo.png
│   └── master-symbol.png
└── .github/
    └── workflows/
        └── deploy.yml
```

## Modelo do banco

### `projects`

- `title`
- `description`
- `category`
- `status`
- `priority`
- `progress`
- `start_date`
- `due_date`
- `completed_at`
- `tags`
- `accent_color`
- `created_at`
- `updated_at`

### `project_attachments`

- `project_id`
- `attachment_type` (`arquivo` ou `link`)
- `name`
- `storage_path`
- `external_url`
- `mime_type`
- `size_bytes`
- `description`
- `created_at`
- `updated_at`

## Próximas evoluções possíveis

A base está preparada para receber tarefas/subtarefas, comentários, histórico de alterações, checklists, dependências entre projetos, indicadores de prazo e visualização estilo Gantt mais detalhada.
