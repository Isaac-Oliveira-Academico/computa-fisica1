# COMPUTA — Solver Educacional de Cinemática

**Versão pública estável: 2.0.1**

Projeto acadêmico desenvolvido no contexto da disciplina de Métodos Computacionais do curso de Física da Universidade Federal de Catalão (UFCAT).

O COMPUTA é um solver educacional que auxilia estudantes na modelagem e análise matemática de problemas de cinemática. O projeto combina um motor matemático em Python com interfaces web executadas diretamente no navegador.

## 1. Acesse o COMPUTA

**Aplicação pública:**

https://isaac-oliveira-academico.github.io/computa-fisica1/

**Repositório:**

https://github.com/Isaac-Oliveira-Academico/computa-fisica1

A aplicação web é gratuita e pode ser utilizada diretamente pelo navegador, sem instalação local de Python.

Na página inicial, o estudante seleciona a versão da ferramenta:

- **COMPUTA 1.1:** interface anterior, preservada para compatibilidade.
- **COMPUTA 2.0:** nova interface para análise de movimento vetorial em duas ou três dimensões.

## 2. Objetivo acadêmico

O objetivo do COMPUTA é apoiar o estudo de Física por meio da resolução matemática e da visualização de movimentos.

O estudante informa as funções que representam a posição da partícula em função do tempo. O motor calcula simbolicamente as derivadas necessárias e permite analisar o comportamento cinemático do sistema.

A ferramenta busca integrar:

- modelagem matemática;
- cálculo simbólico;
- análise de grandezas físicas;
- identificação de eventos do movimento;
- visualização gráfica;
- interpretação física dos resultados.

O software é uma ferramenta de apoio didático. A escolha do modelo físico, a interpretação dos resultados e a validação das hipóteses continuam sendo responsabilidade do estudante.

## 3. Funcionalidades da versão 2.0

A versão 2.0 amplia o escopo da ferramenta para movimentos vetoriais em duas e três dimensões.

### 3.1 Modelagem do movimento

O usuário informa as componentes da posição como funções do tempo:

- `x(t)` — posição no eixo x;
- `y(t)` — posição no eixo y;
- `z(t)` — posição no eixo z, opcional.

O sistema permite representar movimentos bidimensionais e tridimensionais dentro do intervalo de tempo informado.

Exemplos de expressões:

```text
x(t) = 10*t
y(t) = 20*t - 4.9*t**2

x(t) = 2*cos(t)
y(t) = 2*sin(t)
z(t) = 3*t
```

### 3.2 Grandezas cinemáticas

A partir das funções de posição, o motor calcula simbolicamente:

- vetor posição;
- vetor velocidade;
- vetor aceleração;
- rapidez;
- módulo da aceleração.

As componentes da velocidade são obtidas pela primeira derivada temporal da posição. As componentes da aceleração são obtidas pela segunda derivada.

### 3.3 Análise do movimento

A aplicação e o motor disponibilizam análises como:

- avaliação da posição, velocidade e aceleração em um instante;
- deslocamento vetorial entre dois instantes;
- distância total percorrida, calculada numericamente;
- velocidade média vetorial;
- aceleração média vetorial;
- rapidez média;
- resumo quantitativo do intervalo analisado.

### 3.4 Identificação de eventos

O motor possui recursos para identificar eventos relevantes:

- zeros das componentes da velocidade;
- instantes de repouso vetorial;
- máximos e mínimos locais das coordenadas;
- extremos locais da rapidez;
- classificação de eventos por eixo.

É importante distinguir repouso em um eixo de repouso vetorial: uma componente da velocidade pode ser nula sem que a partícula esteja completamente em repouso.

### 3.5 Visualização

A interface web permite visualizar o movimento e seus resultados por meio de gráficos.

Recursos da interface:

- representação da trajetória;
- gráficos das grandezas cinemáticas;
- visualização de movimentos em duas dimensões;
- visualização de movimentos em três dimensões;
- animação da trajetória;
- controles de reprodução, pausa e reinício;
- controle temporal para acompanhar o movimento.

A visualização da trajetória é disponibilizada quando solicitada pelo usuário.

## 4. Exemplos de movimentos

### 4.1 Lançamento oblíquo — movimento 2D

Considere:

```text
x(t) = 10*t
y(t) = 20*t - 4.9*t**2
```

Intervalo de análise:

```text
t inicial = 0 s
t final   = 4.081632653 s
```

O modelo permite analisar a trajetória parabólica, a posição, a velocidade, a aceleração e a altura máxima da partícula.

### 4.2 Movimento helicoidal — movimento 3D

Considere:

```text
x(t) = 2*cos(t)
y(t) = 2*sin(t)
z(t) = 3*t
```

Intervalo de análise:

```text
t inicial = 0 s
t final   = 2*pi s
```

Esse modelo representa uma trajetória helicoidal, permitindo visualizar a evolução espacial da partícula e suas grandezas cinemáticas.

## 5. Arquitetura técnica

O projeto utiliza uma arquitetura híbrida: o motor matemático é desenvolvido em Python, enquanto a interface pública é executada no navegador.

### 5.1 Motor matemático

Tecnologias principais:

- **Python:** implementação do motor;
- **SymPy:** manipulação e diferenciação simbólica;
- **NumPy:** operações e cálculos numéricos;
- **AST:** interpretação controlada das expressões matemáticas.

O interpretador de expressões aceita operações e funções matemáticas explicitamente permitidas, evitando a execução arbitrária de código Python fornecido pelo usuário.

### 5.2 Execução no navegador

A versão 2.0 utiliza:

- **HTML:** estrutura das interfaces;
- **CSS:** apresentação visual;
- **JavaScript:** interação e integração da aplicação;
- **Pyodide:** execução de Python no navegador;
- **Web Worker:** processamento do motor em uma thread separada;
- **Plotly.js:** gráficos e visualizações.

Os módulos Python do motor são disponibilizados na estrutura pública do GitHub Pages e carregados pelo Worker durante a execução.

Assim, o usuário não precisa instalar Python, SymPy ou NumPy para utilizar a aplicação web.

### 5.3 Separação entre fonte e distribuição

O código Python oficial fica em `computa/`.

A cópia destinada à execução no navegador fica em `docs/python/computa/` e é gerada pelo script:

```bash
python scripts/build_web.py
```

A cópia publicada não deve ser editada manualmente. Alterações no motor devem ser feitas na fonte e depois reproduzidas pelo processo de build.

## 6. Estrutura do repositório

```text
computa-fisica1/
│
├── computa/
│   ├── __init__.py
│   ├── core/
│   │   └── expressao.py
│   ├── cinematica/
│   │   ├── movimento.py
│   │   ├── analise.py
│   │   └── eventos.py
│   └── dinamica/
│
├── core/
├── modulos/
│
├── docs/
│   ├── index.html
│   ├── computa1.html
│   ├── computa2.html
│   ├── app.js
│   ├── worker.js
│   ├── style.css
│   ├── css/
│   └── python/
│       └── computa/
│
├── scripts/
│   └── build_web.py
│
├── testes/
│   └── cinematica/
│
├── resultados/
├── main.py
├── requirements.txt
└── README.md
```

Os diretórios `core/` e `modulos/` preservam componentes da implementação anterior. A versão vetorial reorganizada utiliza o pacote `computa/`.

## 7. Instalação para desenvolvimento local

A instalação local é necessária apenas para quem deseja desenvolver, executar testes ou trabalhar diretamente com o motor Python.

### Requisitos

Ambiente de desenvolvimento validado:

- Python 3.12.3;
- pip;
- Git.

Dependências declaradas em `requirements.txt`:

```text
numpy
matplotlib
sympy
```

### Linux / macOS

```bash
git clone https://github.com/Isaac-Oliveira-Academico/computa-fisica1.git

cd computa-fisica1

python3 -m venv .venv

source .venv/bin/activate

python -m pip install --upgrade pip

python -m pip install -r requirements.txt
```

### Windows — PowerShell

```powershell
git clone https://github.com/Isaac-Oliveira-Academico/computa-fisica1.git

cd computa-fisica1

py -m venv .venv

.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip

python -m pip install -r requirements.txt
```

## 8. Build dos módulos para a aplicação web

Depois de modificar o motor Python, gere novamente os módulos destinados ao navegador:

```bash
python scripts/build_web.py
```

O script copia os módulos da fonte `computa/` para `docs/python/computa/`, preservando a organização dos pacotes Python.

Depois do build, confira as alterações:

```bash
git status --short

git diff --check
```

## 9. Testes e validação

O projeto possui testes automatizados para verificar o comportamento do motor e evitar regressões.

### Testes da cinemática vetorial

```bash
python -m unittest discover -s testes/cinematica -v
```

### Testes gerais

```bash
python testes/test_smoke.py

python testes/test_capitulo2.py
```

### Verificação de sintaxe

```bash
python -m py_compile \
  computa/core/expressao.py \
  computa/cinematica/movimento.py \
  computa/cinematica/analise.py \
  computa/cinematica/eventos.py
```

### Verificação de alterações

```bash
git diff --check
```

Na validação da versão 2.0, foram aprovados:

- 32 testes da suíte de cinemática;
- 4 testes de smoke;
- 5 testes do Capítulo 2;
- verificação de sintaxe dos módulos;
- verificação de integridade do diff.

A versão web 2.0.1 também foi testada com movimentos 2D e 3D diretamente na aplicação pública.

## 10. Limitações e escopo atual

O COMPUTA 2.0 é um solver educacional de cinemática vetorial. Não deve ser interpretado como um sistema completo de toda a Mecânica Clássica.

Limitações importantes:

- o escopo vetorial implementado é cinemática em duas e três dimensões;
- o módulo de dinâmica ainda não implementa um solver completo das Leis de Newton;
- não se calcula energia mecânica apenas a partir das funções de posição;
- massa, forças e modelos dinâmicos são necessários para análises de dinâmica;
- a distância percorrida é obtida por integração numérica da rapidez;
- algumas equações podem não possuir soluções simbólicas enumeráveis pelo SymPy;
- singularidades e domínios matemáticos exigem atenção na escolha do intervalo;
- conversão automática e análise dimensional completa de unidades ainda não estão implementadas;
- o resultado depende da adequação das funções informadas ao fenômeno físico estudado.

O projeto poderá receber novos módulos e funcionalidades em versões futuras, mas esses recursos não fazem parte da entrega estável 2.0.1.

## 11. Histórico de versões

### V1.1 — versão anterior

- Interface web original;
- ferramentas de cinemática unidimensional;
- motor e funcionalidades anteriores preservados em `docs/computa1.html`.

### V2.0.0 — expansão vetorial

- reorganização da arquitetura do projeto;
- criação do pacote Python `computa/`;
- motor de cinemática vetorial;
- análise de movimentos em 2D e 3D;
- integração do Python com Pyodide e Web Worker;
- nova interface de seleção de ferramentas;
- gráficos e animações.

### V2.0.1 — correção de publicação

- inclusão de `docs/.nojekyll`;
- correção da publicação dos arquivos internos do pacote Python;
- disponibilização dos módulos `__init__.py` no GitHub Pages;
- validação HTTP dos arquivos necessários ao carregamento do motor;
- testes finais de movimentos 2D e 3D na aplicação pública.

**Tag da versão estável:** `computa-v2.0.1`

## 12. Publicação

A aplicação é hospedada pelo GitHub Pages.

Configuração de publicação:

- branch: `main`;
- diretório: `/docs`;
- arquivo de entrada: `docs/index.html`;
- arquivo de configuração: `docs/.nojekyll`.

A publicação da versão 2.0.1 foi concluída com sucesso e os arquivos Python necessários ao motor foram verificados com resposta HTTP 200.

## 13. Autoria e referência acadêmica

**Autor:** Isaac Oliveira  
**Instituição:** Universidade Federal de Catalão — UFCAT  
**Área:** Física / Métodos Computacionais

**Referência didática de apoio:**

HALLIDAY, David; RESNICK, Robert; WALKER, Jearl. *Fundamentos de Física*. Volume 1. 10ª edição.

O COMPUTA é um projeto acadêmico de caráter educacional, desenvolvido para apoiar o estudo, a modelagem matemática e a visualização de fenômenos físicos.
