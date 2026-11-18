# Plumaris

**v1.0.0 · Primeira versão oficial**

O Plumaris reúne os registros de cães e gatos, dos centros que os acolhem e das preferências das pessoas interessadas em adotar. Com esses dados, é possível consultar animais disponíveis, encontrar candidatos que atendam às preferências de um usuário e acompanhar a oferta e os interesses em adoção.

O backend é uma API REST em Java 21 com Spring Boot 4.1.1. Ele acessa o MySQL 8.4.13 com SQL explícito e JDBC direto (MySQL Connector/J), sem ORM. A interface usa React, TypeScript, Vite e Tailwind CSS. O projeto usa Maven no backend e npm no frontend.

## Executar localmente

Tenha Git, Docker em execução com [Docker Compose](https://docs.docker.com/compose/install/), acesso à internet para baixar imagens e dependências e as portas locais `5173`, `8080` e `3307` livres. Os containers fornecem Java, Maven via Wrapper, Node.js 24, npm e MySQL.

```bash
git clone --branch v1.0.0 https://github.com/Nobutann/plumaris.git
cd plumaris
```

Na raiz, ao lado de [compose.yaml](compose.yaml), crie um arquivo `.env` com duas senhas. Use valores próprios no lugar dos exemplos. O Git ignora esse arquivo.

```dotenv
MYSQL_ROOT_PASSWORD=exemplo-raiz-plumaris-2026
MYSQL_PASSWORD=exemplo-aplicacao-plumaris-2026
```

`MYSQL_ROOT_PASSWORD` é a senha administrativa do MySQL. `MYSQL_PASSWORD` é a senha do usuário `plumaris`, que o backend usa para acessar o banco `adocao_bd`.

```bash
docker compose up --build -d
docker compose ps
```

O backend aguarda a verificação de saúde do MySQL e executa o JAR compilado. O frontend usa o servidor de desenvolvimento do Vite, com atualização automática ao editar os arquivos locais. O Vite encaminha `/api` para `http://backend:8080`. O backend acessa o MySQL em `mysql:3306` pela rede do Compose.

| Serviço | Acesso pelo computador |
| --- | --- |
| Interface | [http://localhost:5173](http://localhost:5173) |
| API | [http://localhost:8080/api/animais](http://localhost:8080/api/animais) |
| MySQL | `127.0.0.1:3307`, banco `adocao_bd`, usuário `plumaris` |

Execute os comandos do Compose na raiz do repositório.

| Ação | Comando |
| --- | --- |
| Iniciar com as imagens existentes | `docker compose up -d` |
| Acompanhar logs | `docker compose logs -f` |
| Consultar os logs de um serviço | `docker compose logs backend` (ou `frontend` ou `mysql`) |
| Reconstruir o backend após editar código Java | `docker compose up --build -d backend` |
| Encerrar e manter os volumes | `docker compose down` |

## Banco de dados e persistência

O volume `mysql_data` guarda os dados do MySQL. O volume `frontend_node_modules` guarda as dependências do frontend no container. A opção `-v` em `docker compose down` exclui os dois volumes, incluindo os dados do banco.

Na primeira inicialização com o diretório de dados vazio, o MySQL cria o banco e o usuário da aplicação, depois executa, nesta ordem, os arquivos montados em `/docker-entrypoint-initdb.d/`.

| Ordem | Arquivo | Conteúdo |
| --- | --- | --- |
| 1 | [01_criacao_tabelas.sql](database/01_criacao_tabelas.sql) | Tabelas e restrições |
| 2 | [02_insercao_dados.sql](database/02_insercao_dados.sql) | Carga inicial, com 30 animais |
| 3 | [04_indices.sql](database/04_indices.sql) | Índices de apoio às consultas |
| 4 | [05_visoes.sql](database/05_visoes.sql) | Visões gerenciais |
| 5 | [07_funcoes.sql](database/07_funcoes.sql) | Funções de prioridade e compatibilidade |
| 6 | [08_procedimentos.sql](database/08_procedimentos.sql) | Procedimentos de adoção e redistribuição |
| 7 | [09_triggers.sql](database/09_triggers.sql) | Tabela de auditoria e triggers |

O script combinado [01_criacao_e_insercao.sql](database/01_criacao_e_insercao.sql) fica fora da carga automática. Os arquivos [03_consultas.sql](database/03_consultas.sql), [06_consultas_avancadas.sql](database/06_consultas_avancadas.sql) e os [exemplos de rotinas](database/exemplos/) são para execução manual. Reiniciar com um volume já inicializado mantém o banco como está. O MySQL só aplica automaticamente as alterações nos scripts e nas senhas do `.env` quando inicializa um volume novo. Em um banco existente, aplique as alterações necessárias diretamente no MySQL.

Para abrir o cliente do container, execute o comando abaixo e informe a senha de `MYSQL_PASSWORD`. Para usar o MySQL Workbench, configure uma conexão TCP/IP com os dados da tabela de acesso.

```bash
docker compose exec mysql mysql -u plumaris -p adocao_bd
```

## Usar a interface

- **Animais** permite listar, cadastrar, editar e excluir animais. Cada animal pertence a um centro. Se informar uma raça, escolha uma da mesma espécie.
- **Raças** permite listar, cadastrar, editar e excluir raças por espécie. Ao excluir uma raça, os animais e preferências vinculados ficam sem raça.
- **Preferências** permite listar, cadastrar, editar e excluir os critérios de adoção. Cada usuário pode ter uma preferência. Deixe um critério em branco para manter a busca aberta a qualquer valor desse campo.
- **Centros** permite listar, cadastrar, editar e excluir centros. O cadastro cria a conta vinculada, com senha exigida na criação. A exclusão é bloqueada quando o centro tem animais ou vínculos com outros centros.
- **Consultas** reúne quatro consultas básicas, quatro avançadas, duas visões, duas funções, dois procedimentos e a área de interesses e auditoria. Escolha um relatório, preencha os filtros disponíveis e clique em **Aplicar filtros**. **Limpar filtros** remove o recorte. Em **Recomendações** e **Índice de compatibilidade por usuário**, informe o ID do usuário.
- **Painel** apresenta indicadores e gráficos. Use **Aplicar filtros** para consultar o recorte, **Limpar filtros** para voltar aos dados completos e **Atualizar dados** para consultar novamente com os filtros aplicados.

### Demonstrar as rotinas

Use uma base de demonstração. As operações de escrita nos exemplos e na interface alteram registros e podem deixar entradas de auditoria.

1. Em **Consultas → Registro de interesse**, informe um usuário existente e um animal disponível para o qual ele ainda não tenha interesse registrado. Em uma carga inicial, o usuário `1` e o animal indisponível `7` permitem conferir o bloqueio do trigger.
2. Em **Conclusão de adoção**, informe um animal disponível e o usuário adotante. O procedimento registra ou atualiza o interesse do adotante e marca o animal como indisponível. Confira o resultado em **Animais** e o evento no **Histórico de auditoria de animais**.
3. Em **Redistribuição de animais na rede**, informe o centro de origem e o limite de animais disponíveis por unidade de destino. Em uma carga inicial, use o centro `32` e o limite `1`. Confira os destinos retornados e os eventos de mudança de centro no histórico.

Para demonstrar direto no MySQL, selecione `adocao_bd` no cliente e execute os trechos de [procedimentos](database/exemplos/08_procedimentos.sql) ou de [triggers](database/exemplos/09_triggers.sql). Os exemplos usam IDs da carga inicial. Execute-os sobre uma carga de demonstração em que esses registros ainda tenham os estados esperados.

## Painel estatístico

| Gráfico | O que mostra |
| --- | --- |
| Animais por espécie | Barras com disponíveis e indisponíveis por espécie |
| Faixas etárias | Barras para 0–1, 2–4, 5 ou mais anos e idade desconhecida |
| Animais por centro | Barras com disponíveis e indisponíveis por centro |
| Oferta e demanda por raça | Barras agrupadas de animais disponíveis e preferências explícitas pela raça |
| Interesses por mês | Série em ordem cronológica dos meses com registros, detalhada em **Valores por mês** |
| Boxplot de idades por espécie | Mínimo, primeiro quartil, mediana, terceiro quartil e máximo |

Os indicadores incluem total de animais, disponíveis, indisponíveis, percentual disponível, centros com animais no recorte, total global de centros cadastrados e total de interesses. O percentual fica sem valor quando o recorte está vazio.

- **Espécie, centro e disponibilidade** filtram os animais. Para contar interesses, o painel considera os atributos atuais dos animais vinculados.
- **Data inicial e data final** afetam apenas o total e a série mensal de interesses. Os dias informados são inclusivos e cada limite pode ser usado sozinho.
- **Centros cadastrados** é um total global. No gráfico por raça, a oferta conta os animais disponíveis no recorte e a demanda conta todas as preferências com vínculo explícito à raça. O filtro de espécie seleciona as raças exibidas, incluindo as que têm oferta e demanda iguais a zero.

O painel calcula a idade em anos completos na data de referência do MySQL e informa quantas idades são válidas ou foram excluídas. Nascimentos ausentes ou futuros entram na faixa desconhecida (`Unknown` na API). Média, mediana, moda, variância populacional e desvio padrão populacional usam apenas idades válidas. Todas as modas empatadas são exibidas se houver repetição. Os quartis usam interpolação linear. Com uma única idade, os quartis coincidem e a dispersão é zero. Sem idades válidas, as medidas numéricas ficam sem valor.

## Referência da API

A API usa JSON com nomes de campos em inglês. A base para chamadas diretas é `http://localhost:8080`.

### Cadastros

Cada rota base aceita `GET` para listar e `POST` para cadastrar. Acrescente `/{id}` para consultar (`GET`), editar (`PUT`) ou excluir (`DELETE`) um registro.

| Rota base | Campos para cadastro e edição |
| --- | --- |
| `/api/animais` | Obrigatórios: `name`, `species`, `available`, `centerId`. Opcionais: `breedId`, `birthDate`, `sex`, `size`, `color`, `description`. |
| `/api/racas` | Obrigatórios: `name`, `species`. |
| `/api/preferencias` | Obrigatório: `userId`. Opcionais: `desiredSpecies`, `desiredSize`, `minimumAge`, `maximumAge`, `desiredSex`, `desiredColor`, `breedId`. As idades são em anos completos. |
| `/api/centros` | Obrigatórios: `name`, `email` e, apenas no `POST`, `password` (8 a 128 caracteres). Opcionais: `description`, `street`, `number`, `neighborhood`, `city`, `state`, `postalCode` (oito dígitos). |

`GET /api/usuarios` lista os IDs e nomes dos usuários existentes. Use `Cao` ou `Gato` para espécie, `Macho` ou `Femea` para sexo, e `Pequeno`, `Medio` ou `Grande` para porte.

### Consultas, visões e painel

Os filtros são opcionais, exceto `userId` em recomendações. IDs usados como filtros são inteiros positivos, e `available` aceita `true` ou `false`. Nos relatórios regionais, `city` faz comparação por igualdade após normalizar espaços e `state` aceita a sigla brasileira em maiúsculas ou minúsculas.

| Rota GET | Parâmetros e efeito |
| --- | --- |
| `/api/animais` | `species`, `centerId`, `available` filtram os animais listados com centro e raça. |
| `/api/animais/resumo-por-especie` | `species`, `centerId`, `available` filtram os animais antes dos totais por espécie e disponibilidade. |
| `/api/animais/faixas-etarias` | `species`, `centerId`, `available` filtram os animais antes dos totais por faixa etária e espécie. |
| `/api/animais/recomendados` | `userId` identifica o usuário. Retorna animais disponíveis que atendem às suas preferências cadastradas. |
| `/api/relatorios/centros-sem-animais-disponiveis` | `city`, `state` selecionam centros da região sem oferta ativa. |
| `/api/relatorios/cobertura-racas-animais` | `species`, `matchStatus` filtram as correspondências. Usa a espécie da raça quando há vínculo e a do animal nos demais casos. |
| `/api/relatorios/preferencias-nao-atendidas` | `userId`, `desiredSpecies`, `breedId` filtram as preferências exibidas. A busca por animais compatíveis é global. |
| `/api/relatorios/animais-acima-media-idade` | `species`, `centerId` filtram os resultados. A média de referência usa os animais disponíveis da espécie com nascimento válido em todos os centros. |
| `/api/relatorios/painel-centros` | `centerId`, `city`, `state` selecionam linhas prontas da visão `vw_painel_operacional_centros`. |
| `/api/relatorios/oferta-demanda-racas` | `species`, `breedId`, `supplyStatus` selecionam linhas prontas da visão `vw_oferta_demanda_por_raca`. |
| `/api/dashboard/estatisticas` | `species`, `centerId`, `available`, `startDate`, `endDate`. As datas usam `YYYY-MM-DD`. Retorna data de referência, filtros aplicados, indicadores, medidas de idade e séries. |

`matchStatus` aceita `Raca com animal`, `Raca sem animal` ou `Animal sem raca`. `supplyStatus` aceita `Deficit de oferta`, `Superavit de oferta` ou `Oferta equilibrada`. Codifique os espaços como `%20` ao montar URLs.

Consulte o painel para cães do centro 32 e restrinja os interesses a setembro de 2026.

```bash
curl 'http://localhost:8080/api/dashboard/estatisticas?species=Cao&centerId=32&startDate=2026-09-01&endDate=2026-09-30'
```

### Funções, procedimentos, interesses e auditoria

Envie os campos das rotas `POST` no corpo JSON.

| Método e rota | Parâmetros e efeito |
| --- | --- |
| `GET /api/relatorios/prioridade-adocao` | Aplica `fn_classificar_prioridade_adocao` para classificar a prioridade de adoção, incluindo a situação dos animais indisponíveis. |
| `GET /api/relatorios/compatibilidade-usuario` | `userId` obrigatório na URL. Usa `fn_pontuacao_compatibilidade` para pontuar a compatibilidade de 0 a 100. |
| `POST /api/relatorios/procedimentos/concluir-adocao` | `animalId`, `userId`. Executa `sp_concluir_adocao_animal`. |
| `POST /api/relatorios/procedimentos/redistribuir-animais` | `sourceCenterId`, `maxPerUnit`. Executa `sp_redistribuir_animais_rede`, que usa um cursor e respeita o limite de animais disponíveis por unidade de destino. |
| `POST /api/relatorios/interesses` | `userId`, `animalId`. O trigger `trg_interesse_before_insert_validar` impede inserir interesse por animal indisponível ou com data futura. |
| `GET /api/relatorios/logs-auditoria` | Lista eventos de mudança de disponibilidade ou de centro que o trigger `trg_animal_after_update_log` grava em `Log_Auditoria_Animal`. |

## Build, lint e testes

Para executar os comandos fora do Docker, use Node.js 24 com npm e Java 21. Rode cada bloco na pasta indicada.

Em [frontend/](frontend/), instale as dependências do lockfile, gere o build e rode o lint.

```bash
npm ci
npm run build
npm run lint
```

Em [backend/](backend/), use o Maven Wrapper.

```bash
sh ./mvnw test
sh ./mvnw package
```

A fase `package` também executa a fase de testes e gera `target/adocao-1.0.0.jar`. O [Dockerfile do backend](backend/Dockerfile) executa `sh mvnw -B -ntp package` e copia o JAR para a imagem de execução.

Na execução padrão rodam os testes de contexto do Spring, cálculo de distribuição etária e controladores HTTP com repositórios simulados. As suítes JDBC de painel e filtros de relatórios só rodam quando `PLUMARIS_TEST_MYSQL_URL` aponta para um servidor MySQL no formato exigido, sem nome de banco nem parâmetros. A construção Docker padrão deixa essas suítes ignoradas.

Para habilitar os testes JDBC, use uma instância MySQL isolada. As credenciais precisam permitir a criação e a remoção dos bancos temporários das suítes e a instalação dos objetos SQL usados pelos testes. Em `backend/`, configure as variáveis com o endereço e as credenciais dessa instância, como neste exemplo.

```bash
export PLUMARIS_TEST_MYSQL_URL='jdbc:mysql://127.0.0.1:3308'
export PLUMARIS_TEST_MYSQL_USER='root'
export PLUMARIS_TEST_MYSQL_PASSWORD='exemplo-senha-do-mysql-de-teste'
sh ./mvnw test
```

## Contribuição e licença

As mensagens de commit seguem [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). O Plumaris é distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE).
