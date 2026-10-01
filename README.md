# Master | Gestor de Projetos

Aplicação web estática em HTML, CSS e JavaScript para GitHub Pages, usando Supabase para autenticação, banco de dados e Storage.

## Funcionalidades atuais

- Login por e-mail e senha via Supabase Auth.
- Cadastro e edição de projetos.
- Status, prioridade, datas, categoria, tags e cor do projeto.
- Checklist de etapas com conclusão automática.
- Descrição e **resultados obtidos** do projeto.
- Quadro por status, timeline e dashboard.
- Arquivos e links associados ao projeto.
- **Backup JSON** de um projeto ou de todo o portfólio.
- **Salvar PDF** do projeto pelo diálogo de impressão do navegador.

## Banco de dados

A estrutura atual usa a tabela `projects` e a tabela `project_attachments`. Para habilitar o novo campo de resultados em um banco já existente, execute `migrate_results.sql` no SQL Editor do Supabase.

A migração é segura para execução repetida porque usa `ADD COLUMN IF NOT EXISTS`.

## Backup

O backup geral é baixado como JSON e contém os dados dos projetos, checklist, resultados e metadados dos arquivos/links. Arquivos binários do Storage não são embutidos no JSON; os registros mantêm `storage_path`, MIME e tamanho para referência.

O PDF é uma versão de apresentação/arquivo do projeto atual. Ao clicar em **Salvar PDF**, o navegador abre a impressão e permite escolher **Salvar como PDF**.

## Supabase

Edite `config.js` com o Project URL e a Publishable key. Nunca use uma `sb_secret_...` no GitHub Pages.

O bucket privado esperado para arquivos é `project-files`.


## Categorias e Guia

As categorias do cadastro são áreas padronizadas, organizadas por grupos ligados à operação de cobrança. As tags permanecem livres e podem receber termos específicos separados por vírgulas.

A aba **Guia de uso** explica o fluxo da interface. Em **Projetos → Quadro**, ao abrir uma pasta de status, o botão **Salvar pasta em PDF** gera um relatório com todos os projetos atualmente exibidos nessa pasta, incluindo descrição, resultados, etapas, tags e metadados.

## Novidades da versão atual

- **Tamanho da visualização:** em Configurações → Aparência é possível ajustar a escala geral da interface de 90% a 160%.
- **Texto formatado:** Nome, Descrição e Resultados obtidos possuem editor com negrito, itálico, sublinhado, tachado, listas e limpeza de formatação.
- **Timeline:** além de Entrega, Início e Conclusão, a ordenação pode ser feita por **Última alteração**, em ordem crescente ou decrescente.
