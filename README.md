# Plumaris - Adoção de Animais

Aplicação para consultar cães, gatos e os centros de adoção responsáveis por eles. O backend oferece uma API REST em Java; o frontend é uma aplicação independente em React e TypeScript.

> **Estado:** primeira versão beta (`v0.1.0-beta.1`). O backend possui as quatro consultas originais, quatro consultas avançadas, duas visões gerenciais e operações de cadastro, alteração e exclusão de animais e raças. O frontend oferece painel com gráficos, manutenção de animais e raças e visualização de todos esses relatórios.

## Estrutura

```text
backend/   API Spring Boot
database/  Tabelas, dados iniciais e consultas SQL
frontend/  Interface React e TypeScript
```

O backend usa Java 21, Spring Boot 4.1.1, Maven e JDBC direto com o driver do MySQL, sem ORM. As consultas e operações de escrita usam SQL explícito. O frontend usa React, TypeScript, Vite e Tailwind CSS e consome a API em JSON.

## Requisitos

- JDK 21
- MySQL Server
- Node.js 20.19+ ou 22.12+ e npm

O Maven Wrapper está incluído em `backend/`; não é necessário instalar Maven separadamente.

## Preparar o banco

Crie o banco no MySQL:

```sql
CREATE DATABASE adocao_bd CHARACTER SET utf8mb4;
USE adocao_bd;
```

Com `adocao_bd` selecionado, execute os scripts nesta ordem:

1. `database/01_criacao_tabelas.sql`
2. `database/02_insercao_dados.sql`
3. `database/04_indices.sql`
4. `database/05_visoes.sql`

Como alternativa aos dois primeiros passos, execute somente `database/01_criacao_e_insercao.sql`, que reúne a versão atual dos scripts de criação e inserção em um único arquivo. O arquivo `database/06_consultas_avancadas.sql` pode ser executado depois para conferir diretamente as quatro consultas da Etapa 04 e o conteúdo das duas visões.

Os scripts de carga foram preparados para um banco vazio. A carga inicial contém 30 animais; confira com `SELECT COUNT(*) FROM Animal;`.

## Configurar e executar o backend

O arquivo `backend/src/main/resources/application.yaml` usa `127.0.0.1:3306`, o banco `adocao_bd` e o usuário MySQL `root`. Defina a variável de ambiente `DB_PASSWORD` com a senha desse usuário antes de iniciar a aplicação. Não grave a senha no repositório.

Na pasta `backend/`, execute:

```powershell
.\mvnw.cmd spring-boot:run
```

Em Linux ou macOS, use `./mvnw spring-boot:run`. No Eclipse, importe `backend/` como projeto Maven e execute `br.org.plumaris.adocao.AdocaoApplication` como aplicação Java. Se a variável `DB_PASSWORD` foi criada após abrir o Eclipse, reinicie o IDE antes de executar.

O servidor inicia na porta 8080. As rotas de consulta de animais são:

- `GET /api/animais`: lista os animais com os nomes do centro de adoção e da raça.
- `GET /api/animais/resumo-por-especie`: retorna os totais de animais disponíveis e indisponíveis por espécie.
- `GET /api/animais/faixas-etarias`: retorna a quantidade de animais por espécie e faixa etária, incluindo a faixa `Unknown` para datas de nascimento ausentes ou futuras.
- `GET /api/animais/recomendados?userId=1`: lista animais disponíveis que atendem aos filtros cadastrados nas preferências do usuário. Retorna uma lista vazia quando não há preferências ou correspondências.

Os campos das respostas JSON usam nomes em inglês. O SQL está explícito no repositório JDBC; as quatro consultas estão reunidas em `database/03_consultas.sql`. Para executar a quarta no Workbench com outro usuário, altere o valor de `@user_id` no arquivo.

Os relatórios da Etapa 04 estão disponíveis nestas rotas:

- `GET /api/relatorios/centros-sem-animais-disponiveis`: anti join de centros sem oferta ativa.
- `GET /api/relatorios/cobertura-racas-animais`: full outer join emulado entre raças e animais.
- `GET /api/relatorios/preferencias-nao-atendidas`: subconsulta com `NOT EXISTS`.
- `GET /api/relatorios/animais-acima-media-idade`: subconsulta correlacionada por espécie.
- `GET /api/relatorios/painel-centros`: dados da visão operacional dos centros.
- `GET /api/relatorios/oferta-demanda-racas`: dados da visão de oferta e demanda por raça.

`GET /api/centros` lista os centros de adoção disponíveis para o cadastro de animais.

Para gerenciar animais, a API oferece também `GET /api/animais/{id}`, `POST /api/animais`, `PUT /api/animais/{id}` e `DELETE /api/animais/{id}`. Um corpo mínimo para criação ou alteração é `{"name":"Fido","species":"Cao","available":true,"centerId":32}`. O centro deve existir; `breedId` é opcional e, quando informado, precisa pertencer à mesma espécie. A exclusão de um animal também exclui suas fotos e registros de interesse, conforme as chaves estrangeiras do banco.

Para gerenciar raças, a API oferece `GET /api/racas`, `GET /api/racas/{id}`, `POST /api/racas`, `PUT /api/racas/{id}` e `DELETE /api/racas/{id}`. As requisições de criação e alteração recebem JSON como `{"name":"Corgi","species":"Cao"}`. Os valores aceitos para `species` são `Cao` e `Gato`. Ao excluir uma raça usada por animais ou preferências, os registros permanecem com `idRaca` nulo, conforme as chaves estrangeiras do banco.

## Executar o frontend

Na pasta `frontend/`, instale as dependências e inicie o servidor de desenvolvimento:

```powershell
npm install
npm run dev
```

Acesse `http://localhost:5173` com o backend em execução na porta 8080. O servidor de desenvolvimento do Vite encaminha as chamadas `/api` ao Spring Boot. Para hospedar o frontend separadamente em produção, configure o servidor HTTP para encaminhar `/api` ao backend.

O painel mostra gráficos de espécie, disponibilidade e faixas etárias calculados a partir das consultas SQL. As seções **Animais** e **Raças** permitem cadastro, edição e exclusão; **Consultas** apresenta dez relatórios: as quatro consultas originais, as quatro consultas avançadas e as duas visões gerenciais.

Para conferir a compilação e as regras de código, execute `npm run build` e `npm run lint`.

## Testar a Etapa 04 automaticamente

Com o banco preparado pelos scripts `01_criacao_e_insercao.sql`, `04_indices.sql` e `05_visoes.sql`, execute na raiz do projeto:

```powershell
.\testar-etapa-04.ps1 -IniciarBackend
```

Se `DB_PASSWORD` ainda não estiver definida, o script solicitará a senha do MySQL sem exibi-la. Ele compila os projetos, inicia temporariamente o backend, testa os quatro relatórios avançados e as duas visões e encerra o processo iniciado. Toda execução é registrada em `logs/teste-etapa-04-AAAAMMDD-HHMMSS.txt`. Use `-ArquivoLog resultado.txt` para escolher outro arquivo, `-ManterBackend` para deixar a API aberta após os testes ou `-PularBuild` para testar somente os endpoints.

## Contribuição

Mantenha as mudanças pequenas e descreva como foram verificadas. As mensagens de commit seguem [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) e são escritas em inglês, por exemplo:

```text
feat(api): add animal listing
docs: document local setup
```

## Licença

O projeto é distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE).
