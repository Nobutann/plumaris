# Plumaris - Adoção de Animais

Aplicação para consultar cães, gatos e os centros de adoção responsáveis por eles. O backend oferece uma API REST em Java; o frontend é uma aplicação independente em React e TypeScript.

O projeto é executado com **Docker Compose**, que inicia MySQL, backend e frontend. A configuração usa o servidor de desenvolvimento do Vite, com atualização automática da interface ao editar o código.

> **Estado:** primeira versão beta (`v0.1.0-beta.1`). O backend possui as quatro consultas originais, quatro consultas avançadas, duas visões gerenciais, duas funções SQL, dois procedimentos armazenados, dois triggers com tabela de auditoria e operações de cadastro, alteração e exclusão de animais, raças e preferências. O frontend oferece painel com gráficos, manutenção de animais, raças e preferências e visualização ou execução de todos esses recursos.

## Estrutura

```text
compose.yaml        Serviços, portas e volumes do Docker Compose
backend/            API Spring Boot e Dockerfile Java
database/           Tabelas, dados iniciais, consultas e rotinas SQL
database/exemplos/  Demonstrações manuais dos procedimentos e triggers
frontend/           Interface React e TypeScript e Dockerfile Node
```

O backend usa Java 21, Spring Boot 4.1.1, Maven e JDBC direto com o driver do MySQL, sem ORM. As consultas e operações de escrita usam SQL explícito. O frontend usa React, TypeScript, Vite e Tailwind CSS e consome a API em JSON.

## Requisitos

- Docker em execução, com suporte ao comando `docker compose`. Consulte a [instalação do Docker Compose](https://docs.docker.com/compose/install/).
- Portas locais `5173`, `8080` e `3307` disponíveis.
- Acesso à internet para baixar imagens e dependências na primeira construção e nas atualizações.

Java 21, Maven, Node.js 24, npm e MySQL 8.4.13 são fornecidos pelos containers. A construção do backend utiliza o Maven Wrapper incluído no projeto.

## Executar o projeto

Abra um terminal na raiz do repositório, onde está o arquivo `compose.yaml`. Os comandos Docker Compose deste README devem ser executados nessa pasta.

### Configuração inicial

Crie um arquivo chamado `.env` na raiz do projeto, ao lado de `compose.yaml`, com este conteúdo. Substitua os valores de exemplo pelas senhas que serão usadas na sua máquina:

```dotenv
MYSQL_ROOT_PASSWORD=troque_por_uma_senha_root
MYSQL_PASSWORD=troque_por_uma_senha_plumaris
```

`MYSQL_ROOT_PASSWORD` define a senha administrativa do MySQL. `MYSQL_PASSWORD` define a senha do usuário `plumaris`, utilizado pela aplicação e pelo acesso ao banco. O `.env` é ignorado pelo Git e deve ser criado em cada máquina.

Inicie os três serviços:

```bash
docker compose up --build -d
```

Na primeira execução, o Docker baixa as imagens, compila o backend e instala as dependências do frontend. O MySQL prepara o banco automaticamente; o backend aguarda a verificação de saúde do banco antes de iniciar.

Depois da inicialização, acesse:

| Serviço | Endereço no computador |
| --- | --- |
| Interface | [http://localhost:5173](http://localhost:5173) |
| API: lista de animais | [http://localhost:8080/api/animais](http://localhost:8080/api/animais) |
| MySQL | `127.0.0.1:3307` |

### Iniciar, acompanhar e encerrar

| Ação | Comando |
| --- | --- |
| Iniciar novamente com as imagens existentes | `docker compose up -d` |
| Construir as imagens e iniciar | `docker compose up --build -d` |
| Conferir os serviços e as portas | `docker compose ps` |
| Acompanhar os logs dos serviços | `docker compose logs -f` |
| Consultar os logs do backend | `docker compose logs backend` |
| Consultar os logs do frontend | `docker compose logs frontend` |
| Consultar os logs do banco | `docker compose logs mysql` |
| Encerrar o projeto, preservando os volumes | `docker compose down` |

Pressione `Ctrl+C` para sair do acompanhamento dos logs; os serviços iniciados com `-d` continuam em execução.

Os dados do banco ficam no volume `mysql_data`, e as dependências do frontend no volume `frontend_node_modules`. **A opção `-v` em `docker compose down` remove esses volumes, incluindo os dados do banco.** Para encerrar o trabalho e continuar depois, use `docker compose down` sem essa opção.

## Banco de dados

### Carga automática

Na primeira inicialização de um volume de dados novo, o MySQL cria `adocao_bd`, cria o usuário `plumaris` e executa estes scripts em ordem:

1. `database/01_criacao_tabelas.sql`
2. `database/02_insercao_dados.sql`
3. `database/04_indices.sql`
4. `database/05_visoes.sql`
5. `database/07_funcoes.sql`
6. `database/08_procedimentos.sql`
7. `database/09_triggers.sql`

O Compose monta esses arquivos individualmente, como somente leitura, em `/docker-entrypoint-initdb.d/`. O script combinado `database/01_criacao_e_insercao.sql` fica fora dessa carga para evitar repetir a criação e a inserção.

A carga inicial contém 30 animais. Para conferir pelo terminal, abra o cliente MySQL do container e informe a senha de `MYSQL_PASSWORD`:

```bash
docker compose exec mysql mysql -u plumaris -p adocao_bd
```

No cliente SQL, execute:

```sql
SELECT COUNT(*) AS total_animais FROM Animal;
```

Os scripts de inicialização são executados apenas quando o diretório de dados está vazio. Alterar um arquivo SQL ou reiniciar os containers não reaplica a carga ao volume existente. Para atualizar o banco atual, execute o SQL da alteração pelo cliente ou pelo Workbench, mantendo o script correspondente atualizado para novas instalações. Da mesma forma, alterar as senhas no `.env` não troca as senhas de usuários de um banco já inicializado.

As consultas `database/03_consultas.sql` e `database/06_consultas_avancadas.sql` estão disponíveis para execução manual. As demonstrações dos procedimentos e triggers estão em `database/exemplos/`; elas executam operações de teste e ficam fora da carga automática. Selecione `adocao_bd` antes de executá-las.

Cada máquina mantém seu próprio volume de dados. Para transportar os registros atuais entre máquinas, exporte e importe um backup; os scripts fornecem o estado inicial.

### Acessar pelo Workbench

Com o serviço `mysql` em execução, crie uma conexão TCP/IP:

| Campo | Valor |
| --- | --- |
| Nome da conexão | `Plumaris Docker` |
| Host | `127.0.0.1` |
| Porta | `3307` |
| Usuário | `plumaris` |
| Senha | Valor de `MYSQL_PASSWORD` no `.env` |
| Schema padrão | `adocao_bd` |

A porta `3307` é a entrada pelo computador. Dentro da rede do Compose, o backend acessa o banco em `mysql:3306`.

## Configuração e API do backend

O Compose fornece `DB_URL=jdbc:mysql://mysql:3306/adocao_bd`, `DB_USERNAME=plumaris` e `DB_PASSWORD` com o valor de `MYSQL_PASSWORD`. Essas variáveis são consumidas por `backend/src/main/resources/application.yaml`.

O frontend recebe `API_PROXY_TARGET=http://backend:8080`, utilizado pelo Vite para encaminhar as chamadas `/api` ao backend. O navegador acessa a interface pela porta `5173`.

As rotas de consulta de animais são:

- `GET /api/animais`: lista os animais com os nomes do centro de adoção e da raça.
- `GET /api/animais/resumo-por-especie`: retorna os totais de animais disponíveis e indisponíveis por espécie.
- `GET /api/animais/faixas-etarias`: retorna a quantidade de animais por espécie e faixa etária, incluindo a faixa `Unknown` para datas de nascimento ausentes ou futuras.
- `GET /api/animais/recomendados?userId=1`: lista animais disponíveis que atendem aos filtros cadastrados nas preferências do usuário. Retorna uma lista vazia quando não há preferências ou correspondências.

Os campos das respostas JSON usam nomes em inglês. O SQL está explícito no repositório JDBC; as quatro consultas estão reunidas em `database/03_consultas.sql`. Para executar a quarta no Workbench com outro usuário, altere o valor de `@user_id` no arquivo.

Os relatórios da Etapa 04 e as rotinas de banco (funções, procedimentos e triggers) estão disponíveis nestas rotas:

- `GET /api/relatorios/centros-sem-animais-disponiveis`: anti join de centros sem oferta ativa.
- `GET /api/relatorios/cobertura-racas-animais`: full outer join emulado entre raças e animais.
- `GET /api/relatorios/preferencias-nao-atendidas`: subconsulta com `NOT EXISTS`.
- `GET /api/relatorios/animais-acima-media-idade`: subconsulta correlacionada por espécie.
- `GET /api/relatorios/painel-centros`: dados da visão operacional dos centros.
- `GET /api/relatorios/oferta-demanda-racas`: dados da visão de oferta e demanda por raça.
- `GET /api/relatorios/prioridade-adocao`: classificação de prioridade de adoção calculada pela função `fn_classificar_prioridade_adocao`.
- `GET /api/relatorios/compatibilidade-usuario?userId=1`: pontuação de compatibilidade (0 a 100) calculada pela função `fn_pontuacao_compatibilidade`.
- `POST /api/relatorios/procedimentos/concluir-adocao`: executa o procedimento `sp_concluir_adocao_animal` para registrar a adoção e atualizar os dados do animal.
- `POST /api/relatorios/procedimentos/redistribuir-animais`: executa o procedimento `sp_redistribuir_animais_rede` (com uso de `CURSOR`) para redistribuir animais disponíveis entre unidades da mesma rede respeitando o limite por unidade.
- `GET /api/relatorios/logs-auditoria`: lista o histórico gravado na tabela `Log_Auditoria_Animal` pelo trigger `trg_animal_after_update_log`.
- `POST /api/relatorios/interesses`: registra interesse de um usuário em um animal, validado pelo trigger `trg_interesse_before_insert_validar`.

A seção **Centros** gerencia os centros de adoção. `GET /api/centros` lista os centros (incluindo `id` e `name` para o seletor de Animais) e `GET /api/centros/{id}` consulta um centro. `POST /api/centros` recebe, no mínimo, `name`, `email` e `password` (8 a 128 caracteres); `PUT /api/centros/{id}` atualiza os dados sem aceitar senha. Ambas as operações aceitam `description`, `street`, `number`, `neighborhood`, `city`, `state` e `postalCode` como campos opcionais.

O cadastro cria o centro e sua conta na mesma transação; o identificador do centro é o da conta. O e-mail editado é o da conta vinculada, e a senha é armazenada apenas como hash com sal, sem ser retornada pela API. `DELETE /api/centros/{id}` é bloqueado se houver animais ou vínculos com outros centros. A exclusão remove os meios de contato do centro e preserva a conta quando ela também pertence a um usuário.

Para gerenciar animais, a API oferece também `GET /api/animais/{id}`, `POST /api/animais`, `PUT /api/animais/{id}` e `DELETE /api/animais/{id}`. Um corpo mínimo para criação ou alteração é `{"name":"Fido","species":"Cao","available":true,"centerId":32}`. O centro deve existir; `breedId` é opcional e, quando informado, precisa pertencer à mesma espécie. A exclusão de um animal também exclui suas fotos e registros de interesse, conforme as chaves estrangeiras do banco.

Para gerenciar raças, a API oferece `GET /api/racas`, `GET /api/racas/{id}`, `POST /api/racas`, `PUT /api/racas/{id}` e `DELETE /api/racas/{id}`. As requisições de criação e alteração recebem JSON como `{"name":"Corgi","species":"Cao"}`. Os valores aceitos para `species` são `Cao` e `Gato`. Ao excluir uma raça usada por animais ou preferências, os registros permanecem com `idRaca` nulo, conforme as chaves estrangeiras do banco.

A seção **Preferências** usa as seguintes rotas:

- `GET /api/preferencias` e `GET /api/preferencias/{id}` retornam os critérios com o nome do usuário e da raça.
- `POST /api/preferencias` cadastra uma preferência. `PUT /api/preferencias/{id}` substitui os critérios e `DELETE /api/preferencias/{id}` exclui o registro.
- `GET /api/usuarios` fornece apenas `id` e `name` para o seletor.

Cada usuário pode ter uma preferência. Para criar ou editar, informe `userId` e, opcionalmente, `desiredSpecies`, `desiredSize`, `minimumAge`, `maximumAge`, `desiredSex`, `desiredColor` e `breedId`. Use `null` ou omita um critério para deixá-lo sem restrição. As idades são em anos completos.

## Desenvolvimento

O painel mostra gráficos de espécie, disponibilidade e faixas etárias calculados a partir das consultas SQL. As seções **Animais**, **Raças** e **Preferências** permitem cadastro, edição e exclusão; **Consultas** apresenta quinze painéis: as quatro consultas originais, as quatro consultas avançadas, as duas visões gerenciais, as duas funções SQL, os dois procedimentos armazenados e a gestão de interesses e histórico de auditoria dos triggers.

### Alterar o backend

Edite os arquivos de `backend/` no seu editor e reconstrua o serviço:

```bash
docker compose up --build -d backend
```

O backend executa o `.jar` compilado; as mudanças em Java entram em funcionamento após a reconstrução. O Dockerfile usa Java 21 e executa `mvnw package`, incluindo os testes, antes de copiar o `.jar` para a imagem de execução. O volume do MySQL é preservado durante a atualização do backend.

## Contribuição

Mantenha as mudanças pequenas e descreva como foram verificadas. As mensagens de commit seguem [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) e são escritas em inglês, por exemplo:

```text
feat(api): add animal listing
docs: document local setup
```

## Licença

O projeto é distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE).
