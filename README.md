# Gestor de Projetos — Master

MVP de um gerenciador interno de projetos e entregas, desenvolvido para rodar como site estático no GitHub Pages, com autenticação e banco PostgreSQL usando Supabase.

## O que já funciona

- login por e-mail e senha;
- sessão persistente no navegador;
- recuperação de senha por e-mail;
- acesso ao sistema somente com usuário autenticado;
- dashboard com indicadores de projetos;
- filtros por texto, status e prioridade;
- cadastro, edição e exclusão de projetos;
- acompanhamento por percentual de progresso;
- destaque de projetos em risco e atrasados;
- banco protegido por Row Level Security (RLS);
- deploy automático no GitHub Pages via GitHub Actions;
- layout responsivo para desktop e celular.

## 1. Criar o projeto no Supabase

1. Acesse o Supabase e crie um novo projeto.
2. Espere o banco ficar disponível.
3. Abra **SQL Editor**.
4. Copie todo o conteúdo de `schema.sql` deste repositório.
5. Execute o script.
6. Confirme que a tabela `public.projects` foi criada.

### O que esse script cria

A tabela `projects` possui:

| Campo | Tipo | Uso |
|---|---|---|
| `id` | uuid | identificador do projeto |
| `title` | text | nome |
| `description` | text | descrição |
| `status` | text | Backlog, Planejado, Em andamento, Em risco, Concluído ou Cancelado |
| `priority` | text | Baixa, Média, Alta ou Urgente |
| `responsible` | text | responsável/equipe |
| `progress` | integer | 0 a 100 |
| `start_date` | date | início |
| `due_date` | date | entrega |
| `created_by` | uuid | usuário autenticado que criou |
| `created_at` | timestamptz | criação |
| `updated_at` | timestamptz | última atualização |

O RLS permite que somente usuários autenticados trabalhem com os registros. Neste primeiro MVP, todos os usuários autenticados do sistema compartilham a visão dos projetos.

## 2. Configurar o login

No Supabase, abra as configurações de **Authentication**.

### Login por e-mail e senha

Mantenha o provedor **Email** habilitado.

Para um sistema interno, uma configuração recomendada é desabilitar **Allow new users to sign up**. Assim, somente usuários que já existirem no Supabase conseguem entrar.

Você poderá criar os usuários manualmente em **Authentication > Users**.

O Supabase também permite exigir confirmação do e-mail antes do primeiro login. Se essa opção estiver ativa, crie/valide os usuários de acordo com a política da empresa.

## 3. Configurar URL do GitHub Pages

No Supabase, procure **Authentication > URL Configuration**.

Defina a **Site URL** como a URL final do site, por exemplo:

`https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`

Para desenvolvimento local, adicione também a URL usada pelo servidor local, por exemplo:

`http://localhost:5500/`

Caso use outra porta, altere o endereço.

A URL usada para recuperação de senha precisa estar na lista de Redirect URLs permitidos.

## 4. Pegar as credenciais do Supabase

Abra **Project Settings > API**.

Copie:

- **Project URL**
- **Publishable key** (`sb_publishable_...`), quando disponível.

Projetos que ainda usam a chave pública legada **anon** também podem utilizá-la no front-end.

### Muito importante

Nunca coloque no arquivo do site:

- `service_role`;
- chaves secretas;
- qualquer credencial com privilégio administrativo.

O arquivo que vai para o GitHub Pages é público. A proteção dos dados é feita pelo usuário autenticado + RLS, não pela tentativa de esconder a chave pública.

## 5. Preencher `config.js`

Abra:

`config.js`

Troque:

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseKey: 'SUA_PUBLISHABLE_KEY'
};
```

pelos dados do seu projeto.

## 6. Criar os usuários do setor

Em **Authentication > Users**, use a opção de criação de usuário.

Exemplo de estrutura:

- joao@empresa.com
- maria@empresa.com
- supervisor@empresa.com

Como o cadastro público pode ficar desabilitado, ninguém consegue criar uma conta sozinho pela tela inicial.

## 7. Testar localmente

Na pasta do projeto, rode:

```bash
python -m http.server 5500
```

Depois abra:

`http://localhost:5500/`

Isso é preferível a abrir o `index.html` diretamente pelo Explorer, pois o fluxo de autenticação depende de um endereço HTTP válido.

## 8. Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos deste projeto.
3. Garanta que a branch principal seja `main`.
4. O arquivo `.github/workflows/deploy.yml` já está pronto para publicar o site automaticamente.
5. No GitHub, abra **Settings > Pages**.
6. Em **Build and deployment > Source**, selecione **GitHub Actions**.
7. Faça um `push` para `main` e aguarde a execução da Action.

Depois da publicação, use a URL final do Pages nas configurações de URL do Supabase.

## 9. Fluxo de segurança

O funcionamento é:

```text
Usuário
  ↓
Tela de login
  ↓
Supabase Auth
  ↓
JWT da sessão
  ↓
Supabase Data API
  ↓
RLS na tabela projects
  ↓
Projetos do setor
```

Mesmo que alguém descubra a URL e a chave pública do projeto, as operações sobre `projects` continuam dependendo das políticas RLS executadas no banco.

## 10. Próxima evolução recomendada

A arquitetura já deixa espaço para evoluir para:

- tarefas dentro de cada projeto;
- comentários e histórico de alterações;
- responsáveis ligados aos usuários do Supabase, em vez de texto livre;
- níveis de acesso (admin, gestor e membro);
- anexos em Storage;
- calendário de entregas;
- visão Kanban;
- notificações e lembretes;
- página individual do projeto;
- auditoria de quem alterou cada campo.

## Paleta visual

A interface usa uma paleta inspirada na identidade visual digital da Master Internet, com azul como cor principal e amarelo como acento. A referência visual pública da marca é a Master Internet sediada em Divinópolis/MG. Como não encontrei um manual público com os códigos hex oficiais durante a montagem, os valores abaixo são uma aproximação de interface e podem ser ajustados quando o logo/manual interno da empresa estiver disponível.

```text
Azul principal  #0457B7
Azul escuro     #003D82
Azul profundo   #082D52
Ciano           #12A4D9
Amarelo         #FFC300
Cinza fundo     #EEF3F7
Cinza linha     #DDE5ED
Texto           #17324D
```

## Observação sobre o MVP

Neste primeiro estágio, qualquer usuário autenticado pode visualizar e editar os projetos compartilhados pelo setor. Para uma implantação corporativa definitiva, recomenda-se incluir papéis e permissões no banco antes de usar o sistema com dados sensíveis.
