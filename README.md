# Datathon Frontend (Interface Visual)

Este repositório contém o frontend (Interface de Usuário) para o projeto de detecção de Risco de Defasagem Escolar, consumindo a [API Datathon Backend](../datathon-backend).

Foi desenvolvido como uma **Single Page Application (SPA)** utilizando **React 19** e **Vite**, projetado para uma experiência moderna e focada em acompanhamento dos ciclos de vida de modelos de IA.

## 🚀 Tecnologias Utilizadas

*   **React 19:** Biblioteca núcleo para UI em sistema de componentes.
*   **Vite:** Bundler de alta velocidade e gerenciador de build.
*   **Axios:** Usado para realizar consultas assíncronas aos endpoints da API do motor de Inteligência Artificial.
*   **Lucide-React:** Suíte moderna para visualizações e ícones.
*   **CSS Puro / Modules:** Layout estruturado com responsividade e Vanilla CSS (`index.css` e `App.css`).

---

## 📱 Mapeamento de Telas (Views)

A interface é construída em uma navegação lateral fixa, abrangendo 4 áreas principais para o fluxo de Machine Learning:

1.  **Importar Excel (`/import`)**:
    Interface baseada em arrastar e soltar (Drag and Drop) para o usuário inserir as grandes planilhas `.xlsx`. Ele conecta ao endpoint da API para retornar um `.csv` devidamente normalizado pelas colunas cadastradas sem que o servidor estoure memória.

2.  **Pipeline de ML (`/train`)**:
    Funciona como uma esteira visual do "Ciclo de Vida do ML". Ao clicar nestes botões, o usuário ativa consecutivamente:
    *   O Split (Treino 80% e Teste 20%), 
    *   Ingestão no cache,
    *   Limpeza, 
    *   Processo de Treinamento em massa via XGBoost e Sklearn,
    *   Geração de métricas de acurácia, F1-Score e Recall contra dados restritos.
    *   **Drift Check:** Permite marcar uma caixa (checkbox) que habilita recálculos estatísticos. Se detectado desvio estatístico nas bases de dados, ele induz o back-end a rodar um **Auto-Retrain** automaticamente.

3.  **Experimentos MLOps (`/mlflow`)**:
    Dashboard que lê do banco de dados `mlflow` localizado no backend. Entrega um ranking visual ou um "Model Leaderboard", detalhando parâmetros testados (ex: `n_estimators`, `max_depth` do Optuna), identificando o tempo em milissegundos gasto por cada execução e carimbando com medalhas (🥇, 🥈, 🥉) os três modelos eleitos mais eficientes.

4.  **Docs / API (`/docs`)**:
    Área rápida de documentação in-app para usuários copiarem comandos Curl básicos e entenderem payloads das predições interativas.

---

## 🛠️ Como Executar Localmente

**Pré-requisitos:** [Node.js](https://nodejs.org/) instalado (versão 18+ ou Node 22+).

1.  **Clone o Repositório e entre na pasta:**
    ```bash
    cd datathon-frontend
    ```

2.  **Instale as dependências (Node Modules):**
    ```bash
    npm install
    ```

3.  **Configuração do Banco Local:**
    Por padrão, o frontend enviará as requisições para `http://localhost:8000`. Confirme que sua aplicação `datathon-backend` está ativa em paralelo nesta mesma porta. Se a API estiver alocada em outro destino remoto, defina a variável `VITE_API_URL` apontando para a rede respectiva num arquivo `.env`.

4.  **Inicie o Ambiente de Desenvolvimento (Hot-reload):**
    ```bash
    npm run dev
    ```

5.  Acesse o link impresso pelo terminal, geralmente **[http://localhost:5173](http://localhost:5173)** no seu navegador.

---

## 📦 Build para Produção (Deploy)

Para transformar sua aplicação em bibliotecas otimizadas e leves:

```bash
npm run build
```
O comando empacotará a estrutura dentro da pasta `dist/` gerando minificação de CSS/JS para deployamento simples em um Storage S3, Nuvem Vercel ou Nginx.
