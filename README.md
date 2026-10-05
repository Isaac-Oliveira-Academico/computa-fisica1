# COMPUTA — Solver Educacional de Cinemática 1D

Projeto desenvolvido para a disciplina de **Métodos Computacionais — Física I (UFCAT)**.

**Autor:** Isaac Oliveira  
**Referência didática principal:** Halliday, Resnick e Walker — *Fundamentos de Física*, 10ª edição, Volume 1, Capítulo 2 — Movimento Retilíneo.

## 1. Objetivo

O COMPUTA é um solver educacional de cinemática unidimensional. A proposta é que o estudante interprete o problema físico e informe o modelo/dados; o programa executa a parte matemática, apresenta resultados e permite análises de posição, velocidade e aceleração.

O projeto possui duas interfaces:

- **Terminal Python (CLI):** interface mais completa no estado atual.
- **Web:** interface pública para uso direto no navegador, com um subconjunto das funcionalidades do motor Python.

## 2. Links

**Repositório:**  
https://github.com/Isaac-Oliveira-Academico/computa-fisica1

**Aplicação Web:**  
https://isaac-oliveira-academico.github.io/computa-fisica1/

**Snapshot funcional auditado:** commit `7d94326` (`web-v1.1`).

> Para uma entrega acadêmica reprodutível, recomenda-se criar uma tag específica da entrega após a inclusão deste README.

## 3. O que o COMPUTA resolve atualmente

### 3.1 Terminal Python

O motor Python permite trabalhar com:

- MUV numérico com as grandezas `x0`, `x`, `v0`, `v`, `a` e `t`;
- função conhecida `x(t)`, `v(t)` ou `a(t)`;
- derivação e integração simbólica com SymPy;
- condições iniciais quando a entrada é `v(t)` ou `a(t)`;
- movimento por trechos (Piecewise) informado analiticamente;
- avaliação de `x`, `v` e `a` em um instante;
- instantes em que posição, velocidade ou aceleração assumem determinado valor;
- instantes em que a partícula para (`v(t)=0`);
- máximos e mínimos de posição e velocidade;
- deslocamento e velocidade média;
- aceleração média;
- distância total e velocidade escalar média;
- intervalos de sinal de velocidade e aceleração;
- comparação entre duas partículas;
- gráficos de posição, velocidade e aceleração.

### 3.2 Interface Web V1.1

A interface Web permite, a partir de uma função posição `x(t)`:

- obter `v(t)` e `a(t)`;
- avaliar o estado em um instante;
- localizar valores de posição, velocidade e aceleração;
- localizar paradas (`v=0`);
- calcular extremos de posição e velocidade;
- calcular deslocamento, velocidade média e aceleração média;
- calcular distância total e velocidade escalar média;
- analisar sinais de `v(t)` e `a(t)`;
- comparar duas partículas em operações suportadas;
- gerar gráficos de `x(t)`, `v(t)` e `a(t)`;
- executar cálculos simbólicos em Web Worker, com cancelamento e proteção contra expressões excessivamente complexas.

## 4. O que ainda não resolve / limitações conhecidas

O projeto **não deve ser considerado um solver completo de todo o Capítulo 2 do Halliday**. A cobertura ainda está sendo auditada exercício por exercício.

Limitações atuais relevantes:

- a Web ainda não aceita `v(t)` ou `a(t)` como entrada principal;
- a Web ainda não possui interface para MUV numérico;
- a Web ainda não possui construtor visual de movimentos por trechos (Piecewise);
- gráficos e tabelas ainda não podem ser usados diretamente como entrada;
- um gráfico `v(t)` precisa ser interpretado pelo usuário e convertido em funções por trechos antes de ser tratado pelo motor Python;
- domínio físico e domínio matemático de `x(t)`, `v(t)` e `a(t)` ainda não estão completamente separados;
- singularidades, como `x(t)=1/(t-1)`, ainda exigem cuidado: o sistema pode não segmentar automaticamente o domínio de forma adequada;
- conversão automática e análise dimensional de unidades ainda não foram implementadas;
- o escopo atual é cinemática 1D; módulos como vetores e Leis de Newton ainda não estão implementados;
- a Web e o terminal ainda possuem implementações físicas duplicadas; a unificação do núcleo é uma refatoração planejada;
- a Web possui limites heurísticos de complexidade para evitar travamentos do navegador;
- algumas expressões matematicamente ambíguas ou com ramos complexos podem exigir tratamento adicional.

## 5. Requisitos

O snapshot desta entrega foi testado com **Python 3.13.5**.

Dependências declaradas em `requirements.txt`:

```text
numpy
matplotlib
sympy
```

Outras versões recentes do Python podem funcionar, mas não foram validadas nesta entrega.

## 6. Instalação local

### Linux / macOS

```bash
git clone https://github.com/Isaac-Oliveira-Academico/computa-fisica1.git
cd computa-fisica1

python3 -m venv .venv
source .venv/bin/activate

python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

python3 main.py
```

### Windows (PowerShell)

```powershell
git clone https://github.com/Isaac-Oliveira-Academico/computa-fisica1.git
cd computa-fisica1

py -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

python main.py
```

## 7. Como testar rapidamente pelo terminal

Execute:

```bash
python3 main.py
```

Escolha:

```text
1 — Cinemática 1D
2 — Uma função x(t), v(t) ou a(t)
x — Posição x(t)
```

Use o exemplo:

```text
x(t) = 3*t - 4*t**2 + t**3
Tempo inicial = 0
Tempo final = 4
```

Resultados de referência:

```text
x(1) = 0 m
x(2) = -2 m
x(4) = 12 m

v(t) = 3 - 8*t + 3*t**2
a(t) = -8 + 6*t

deslocamento de 0 a 4 s = 12 m
velocidade média de 2 a 4 s = 7 m/s
aceleração média de 2 a 4 s = 10 m/s²

v(t)=0 em aproximadamente:
t = 0.4514 s
t = 2.2153 s
```

Esse caso corresponde ao tipo de questão usado na avaliação da disciplina e pode ser utilizado como teste de aceitação.

## 8. Exemplo de limitação: entrada por gráfico

Um problema fornecido apenas por gráfico `v(t)` ainda não pode ser inserido diretamente na interface Web.

No terminal Python, o usuário pode primeiro interpretar o gráfico e convertê-lo em funções por trechos. Por exemplo:

```text
v(t) = 2*t         para 0 <= t <= 2
v(t) = 4           para 2 <= t <= 4
v(t) = 12 - 2*t    para 4 <= t <= 6
```

Depois disso, o motor Piecewise pode analisar o movimento. A interpretação automática do gráfico ainda não está implementada.

## 9. Testes automatizados

A entrega possui duas suítes simples de testes.

Execute:

```bash
python3 testes/test_smoke.py
python3 testes/test_capitulo2.py
```

No snapshot auditado, os testes retornam sucesso para:

```text
MUV numérico
cinemática simbólica
comparação entre duas partículas
validação de dados incompatíveis
Halliday 2.20 — raízes de v(t) e a(t)
Halliday 2.18 — extremos e velocidade média
distância total com inversão de movimento
Halliday 2.21 — Piecewise
intervalos de sinal de v(t) e a(t)
```

Também pode ser feita uma verificação de sintaxe Python:

```bash
python3 -m py_compile main.py core/*.py modulos/*.py testes/*.py
```

## 10. Estrutura principal do projeto

```text
core/
  entrada.py
  solver.py

modulos/
  cinematica.py
  movimento_1d.py
  eventos_cinematica.py
  graficos_cinematica.py

testes/
  test_smoke.py
  test_capitulo2.py

docs/
  index.html
  app.js
  style.css
  worker.js

main.py
requirements.txt
```

## 11. Observação sobre a cobertura do Halliday

Os testes existentes demonstram que o motor resolve classes importantes de problemas do Capítulo 2, mas **não demonstram cobertura integral do capítulo**. A meta do projeto é manter uma matriz exercício por exercício com os estados `RESOLVE`, `PARCIAL` e `NÃO RESOLVE` e ampliar a suíte de regressão conforme a auditoria avança.
