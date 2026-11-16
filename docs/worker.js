/* COMPUTA Web V1.1 — worker de cálculo Python/SymPy */

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";
const PYODIDE_INDEX = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";

let pyodide = null;
let pronto = false;

const PYTHON_ENGINE = String.raw`
import json
import math
import sympy as sp

t = sp.symbols("t", real=True)
payload = json.loads(payload_json)
acao = str(payload.get("acao", "modelo"))

SAFE_LOCALS = {
    "t": t,
    "sqrt": sp.sqrt,
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "exp": sp.exp,
    "log": sp.log,
    "abs": sp.Abs,
    "Abs": sp.Abs,
    "pi": sp.pi,
    "E": sp.E,
}

class EntradaComplexaError(ValueError):
    pass

def parse_expressao(texto, permitir_t=True):
    texto = str(texto).strip().replace("^", "**")
    if not texto:
        raise ValueError("Expressão vazia.")
    expr = sp.sympify(texto, locals=SAFE_LOCALS)
    if permitir_t:
        if not expr.free_symbols.issubset({t}):
            raise ValueError("A expressão só pode depender de t.")
    else:
        if expr.free_symbols:
            raise ValueError("Este valor deve ser numérico.")
    if sp.count_ops(expr) > 80:
        raise EntradaComplexaError("A expressão contém operações demais para o modo interativo.")
    for potencia in expr.atoms(sp.Pow):
        expoente = sp.simplify(potencia.exp)
        if expoente.free_symbols:
            raise EntradaComplexaError("Expoentes dependentes de t não são aceitos nesta versão.")
        if expoente.is_number:
            try:
                valor_exp = abs(float(sp.N(expoente)))
            except Exception:
                valor_exp = 0.0
            if valor_exp > 20:
                raise EntradaComplexaError(
                    f"Expoente muito alto detectado: {expoente}. Verifique se houve erro de digitação."
                )
    return sp.simplify(expr)

def numero_real(expr):
    valor = complex(sp.N(expr))
    if abs(valor.imag) > 1e-10:
        raise ValueError("O resultado não é real.")
    return float(valor.real)

def valor_serializado(expr):
    expr = sp.simplify(expr)
    return {"exato": str(expr), "numerico": numero_real(expr)}

def tempo_serializado(expr):
    return valor_serializado(expr)

def adicionar_candidato(lista, candidato):
    for existente in lista:
        if sp.simplify(existente - candidato) == 0:
            return
    lista.append(candidato)

def parse_tempo(texto):
    return parse_expressao(texto, permitir_t=False)

def texto_intervalo(intervalo):
    esquerda = "(" if intervalo.left_open else "["
    direita = ")" if intervalo.right_open else "]"
    return f"{esquerda}{sp.simplify(intervalo.start)}, {sp.simplify(intervalo.end)}{direita}"

def conjunto_para_intervalos(conjunto):
    conjunto = sp.simplify(conjunto)
    if conjunto == sp.EmptySet:
        return []
    if isinstance(conjunto, sp.Interval):
        return [texto_intervalo(conjunto)]
    if isinstance(conjunto, sp.Union):
        partes = []
        for item in conjunto.args:
            if isinstance(item, sp.Interval):
                partes.append(texto_intervalo(item))
            else:
                partes.append(str(item))
        return partes
    return [str(conjunto)]

def resolver_condicao(expressao, alvo, dominio_resolucao):
    diferenca = sp.simplify(expressao - alvo)
    if diferenca == 0:
        return {"tipo": "todo_dominio", "exatas": [], "numericas": [], "texto": str(dominio_resolucao)}
    solucoes = sp.solveset(diferenca, t, domain=dominio_resolucao)
    if solucoes == sp.EmptySet:
        return {"tipo": "nenhuma", "exatas": [], "numericas": [], "texto": ""}
    if solucoes == dominio_resolucao:
        return {"tipo": "todo_dominio", "exatas": [], "numericas": [], "texto": str(solucoes)}
    if isinstance(solucoes, sp.FiniteSet):
        ordenadas = sorted(list(solucoes), key=numero_real)
        return {
            "tipo": "pontos",
            "exatas": [str(sp.simplify(valor)) for valor in ordenadas],
            "numericas": [numero_real(valor) for valor in ordenadas],
            "texto": ""
        }
    return {"tipo": "nao_reduzido", "exatas": [str(solucoes)], "numericas": [], "texto": str(solucoes)}

def validar_intervalo(t1, t2, inicio, fim):
    t1_num = numero_real(t1)
    t2_num = numero_real(t2)
    inicio_num = numero_real(inicio)
    fim_num = numero_real(fim)
    if t1_num < inicio_num or t1_num > fim_num or t2_num < inicio_num or t2_num > fim_num:
        return False, "O intervalo informado ultrapassa o domínio físico do movimento."
    if t2_num <= t1_num:
        return False, "O instante t₂ deve ser maior que o instante t₁."
    return True, ""

def calcular_extremos_globais(expressao, derivada, dominio):
    inicio = dominio.start
    fim = dominio.end
    if sp.simplify(derivada) == 0:
        valor = sp.simplify(expressao.subs(t, inicio))
        return {
            "tipo": "constante", "mensagem": "",
            "min_valor": valor_serializado(valor),
            "max_valor": valor_serializado(valor),
            "min_tempos": [], "max_tempos": []
        }
    estacionarios = sp.solveset(sp.simplify(derivada), t, domain=dominio)
    candidatos = []
    adicionar_candidato(candidatos, inicio)
    adicionar_candidato(candidatos, fim)
    if estacionarios == sp.EmptySet:
        pass
    elif isinstance(estacionarios, sp.FiniteSet):
        for ponto in estacionarios:
            adicionar_candidato(candidatos, ponto)
    else:
        return {
            "tipo": "limitacao",
            "mensagem": "Os pontos estacionários não puderam ser reduzidos automaticamente a um conjunto finito."
        }
    pares = []
    for instante in candidatos:
        valor = sp.simplify(expressao.subs(t, instante))
        pares.append((instante, valor, numero_real(valor)))
    minimo_num = min(item[2] for item in pares)
    maximo_num = max(item[2] for item in pares)
    tolerancia = 1e-9
    min_pares = [item for item in pares if abs(item[2] - minimo_num) <= tolerancia]
    max_pares = [item for item in pares if abs(item[2] - maximo_num) <= tolerancia]
    return {
        "tipo": "ok", "mensagem": "",
        "min_valor": valor_serializado(min_pares[0][1]),
        "max_valor": valor_serializado(max_pares[0][1]),
        "min_tempos": [tempo_serializado(item[0]) for item in min_pares],
        "max_tempos": [tempo_serializado(item[0]) for item in max_pares]
    }

def analisar_sinal(expressao, dominio):
    expressao = sp.simplify(expressao)
    if expressao == 0:
        return {
            "positivo": [], "negativo": [], "zero_tipo": "todo_dominio",
            "zeros": [], "zero_texto": texto_intervalo(dominio)
        }
    if not expressao.free_symbols:
        valor = numero_real(expressao)
        return {
            "positivo": [texto_intervalo(dominio)] if valor > 0 else [],
            "negativo": [texto_intervalo(dominio)] if valor < 0 else [],
            "zero_tipo": "nenhum", "zeros": [], "zero_texto": ""
        }
    positivo = sp.solve_univariate_inequality(expressao > 0, t, relational=False).intersect(dominio)
    negativo = sp.solve_univariate_inequality(expressao < 0, t, relational=False).intersect(dominio)
    zeros = resolver_condicao(expressao, sp.Integer(0), dominio)
    return {
        "positivo": conjunto_para_intervalos(positivo),
        "negativo": conjunto_para_intervalos(negativo),
        "zero_tipo": zeros["tipo"],
        "zeros": [
            {"exato": exato, "numerico": numerico}
            for exato, numerico in zip(zeros.get("exatas", []), zeros.get("numericas", []))
        ],
        "zero_texto": zeros.get("texto", "")
    }

def numero_grafico(expr, instante):
    try:
        valor = expr.subs(t, instante)
        numero = complex(sp.N(valor))
        if abs(numero.imag) > 1e-9 or not math.isfinite(numero.real):
            return None
        return float(numero.real)
    except Exception:
        return None

def gerar_graficos(x, v, a, inicio, fim):
    n = 401
    inicio_num = numero_real(inicio)
    fim_num = numero_real(fim)
    tempos = [inicio_num + (fim_num - inicio_num) * i / (n - 1) for i in range(n)]
    return {
        "tipo_operacao": "graficos",
        "grafico_pontos": n,
        "tempos": tempos,
        "x_valores": [numero_grafico(x, tt) for tt in tempos],
        "v_valores": [numero_grafico(v, tt) for tt in tempos],
        "a_valores": [numero_grafico(a, tt) for tt in tempos]
    }

x = parse_expressao(payload["funcao"], permitir_t=True)
v = sp.simplify(sp.diff(x, t))
a = sp.simplify(sp.diff(v, t))

if sp.count_ops(v) > 120 or sp.count_ops(a) > 160:
    raise EntradaComplexaError("As derivadas geradas ficaram complexas demais para o modo interativo.")

t_inicial_exato = sp.Rational(str(payload["t_inicial"]))
t_final_exato = sp.Rational(str(payload["t_final"]))

if t_final_exato <= t_inicial_exato:
    raise ValueError("O tempo final deve ser maior que o tempo inicial.")

dominio = sp.Interval(t_inicial_exato, t_final_exato)

resultado = {
    "ok": True,
    "acao": acao,
    "tipo_operacao": "modelo",
    "t_inicial": str(t_inicial_exato),
    "t_final": str(t_final_exato),
    "x": str(sp.factor(x)),
    "v": str(sp.factor(v)),
    "a": str(sp.factor(a)),
}

if acao == "graficos":
    resultado.update(gerar_graficos(x, v, a, t_inicial_exato, t_final_exato))

elif acao == "avaliar":
    instante = parse_tempo(payload.get("entrada_extra", "0"))
    instante_num = numero_real(instante)
    valido = numero_real(t_inicial_exato) <= instante_num <= numero_real(t_final_exato)
    resultado.update({
        "tipo_operacao": "avaliacao",
        "instante": tempo_serializado(instante),
        "avaliacao_valida": valido,
        "avaliacao_mensagem": "" if valido else "O instante informado está fora do domínio físico."
    })
    if valido:
        resultado.update({
            "x_avaliado": valor_serializado(x.subs(t, instante)),
            "v_avaliado": valor_serializado(v.subs(t, instante)),
            "a_avaliado": valor_serializado(a.subs(t, instante))
        })

elif acao in {"posicao", "velocidade", "aceleracao", "parar"}:
    mapa = {
        "posicao": (x, "x(t)", "m"),
        "velocidade": (v, "v(t)", "m/s"),
        "aceleracao": (a, "a(t)", "m/s²"),
        "parar": (v, "v(t)", "m/s")
    }
    expressao_evento, nome_evento, unidade_evento = mapa[acao]
    alvo = sp.Integer(0) if acao == "parar" else parse_expressao(payload.get("entrada_extra", "0"), permitir_t=False)
    solucao = resolver_condicao(expressao_evento, alvo, dominio)
    resultado.update({
        "tipo_operacao": "evento",
        "grandeza_nome": nome_evento,
        "unidade": unidade_evento,
        "alvo": str(sp.simplify(alvo)),
        "tipo_evento": solucao["tipo"],
        "solucoes_exatas": solucao["exatas"],
        "solucoes_numericas": solucao["numericas"],
        "solucoes_texto": solucao["texto"]
    })

elif acao in {"extremos_posicao", "extremos_velocidade"}:
    if acao == "extremos_posicao":
        expressao_ext, derivada_ext, nome_ext, unidade_ext = x, v, "posição x(t)", "m"
    else:
        expressao_ext, derivada_ext, nome_ext, unidade_ext = v, a, "velocidade v(t)", "m/s"
    extremos = calcular_extremos_globais(expressao_ext, derivada_ext, dominio)
    resultado.update({
        "tipo_operacao": "extremos",
        "extremos_grandeza_nome": nome_ext,
        "extremos_unidade": unidade_ext,
        "extremos_tipo": extremos["tipo"],
        "extremos_mensagem": extremos.get("mensagem", "")
    })
    if extremos["tipo"] != "limitacao":
        resultado.update({
            "minimo_valor": extremos["min_valor"],
            "maximo_valor": extremos["max_valor"],
            "minimo_tempos": extremos["min_tempos"],
            "maximo_tempos": extremos["max_tempos"]
        })

elif acao in {"medias_intervalo", "distancia_escalar"}:
    t1 = parse_tempo(payload.get("intervalo_t1", "0"))
    t2 = parse_tempo(payload.get("intervalo_t2", "1"))
    intervalo_valido, mensagem = validar_intervalo(t1, t2, t_inicial_exato, t_final_exato)
    resultado.update({
        "tipo_operacao": acao,
        "intervalo_valido": intervalo_valido,
        "intervalo_mensagem": mensagem,
        "intervalo_t1": tempo_serializado(t1),
        "intervalo_t2": tempo_serializado(t2)
    })
    if intervalo_valido:
        x1 = sp.simplify(x.subs(t, t1))
        x2 = sp.simplify(x.subs(t, t2))
        v1 = sp.simplify(v.subs(t, t1))
        v2 = sp.simplify(v.subs(t, t2))
        delta_t = sp.simplify(t2 - t1)
        deslocamento = sp.simplify(x2 - x1)
        velocidade_media = sp.simplify(deslocamento / delta_t)
        resultado.update({
            "x_t1": valor_serializado(x1),
            "x_t2": valor_serializado(x2),
            "v_t1": valor_serializado(v1),
            "v_t2": valor_serializado(v2),
            "delta_t": valor_serializado(delta_t),
            "deslocamento": valor_serializado(deslocamento),
            "velocidade_media": valor_serializado(velocidade_media)
        })
        if acao == "medias_intervalo":
            resultado["aceleracao_media"] = valor_serializado(sp.simplify((v2 - v1) / delta_t))
        if acao == "distancia_escalar":
            dominio_intervalo = sp.Interval(t1, t2)
            zeros_v = sp.solveset(v, t, domain=dominio_intervalo)
            if zeros_v == sp.EmptySet:
                pontos = [t1, t2]
            elif isinstance(zeros_v, sp.FiniteSet):
                pontos = [t1]
                for raiz in sorted(list(zeros_v), key=numero_real):
                    if numero_real(t1) < numero_real(raiz) < numero_real(t2):
                        adicionar_candidato(pontos, raiz)
                adicionar_candidato(pontos, t2)
            elif sp.simplify(v) == 0:
                pontos = [t1, t2]
            else:
                resultado.update({
                    "distancia_tipo": "limitacao",
                    "distancia_mensagem": "Os pontos de inversão do movimento não puderam ser reduzidos automaticamente a um conjunto finito."
                })
                pontos = None
            if pontos is not None:
                pontos = sorted(pontos, key=numero_real)
                distancia_total = sp.Integer(0)
                for p1, p2 in zip(pontos[:-1], pontos[1:]):
                    distancia_total += sp.Abs(sp.simplify(x.subs(t, p2) - x.subs(t, p1)))
                distancia_total = sp.simplify(distancia_total)
                velocidade_escalar_media = sp.simplify(distancia_total / delta_t)
                resultado.update({
                    "distancia_tipo": "ok",
                    "pontos_inversao": [tempo_serializado(ponto) for ponto in pontos],
                    "distancia_total": valor_serializado(distancia_total),
                    "velocidade_escalar_media": valor_serializado(velocidade_escalar_media)
                })

elif acao == "sinais":
    resultado.update({
        "tipo_operacao": "sinais",
        "sinal_v": analisar_sinal(v, dominio),
        "sinal_a": analisar_sinal(a, dominio)
    })

elif acao == "comparar":
    x_b = parse_expressao(payload.get("funcao_b", ""), permitir_t=True)
    v_b = sp.simplify(sp.diff(x_b, t))
    t_b_inicial = sp.Rational(str(payload.get("t_b_inicial", 0)))
    t_b_final = sp.Rational(str(payload.get("t_b_final", 1)))
    if t_b_final <= t_b_inicial:
        raise ValueError("O tempo final da partícula B deve ser maior que o tempo inicial.")
    dominio_b = sp.Interval(t_b_inicial, t_b_final)
    dominio_comum = dominio.intersect(dominio_b)
    resultado.update({
        "tipo_operacao": "comparacao",
        "x_b": str(sp.factor(x_b)),
        "v_b": str(sp.factor(v_b)),
        "t_b_inicial": str(t_b_inicial),
        "t_b_final": str(t_b_final),
        "dominio_comum_vazio": dominio_comum == sp.EmptySet,
        "dominio_comum": "" if dominio_comum == sp.EmptySet else texto_intervalo(dominio_comum),
        "comparacao_tipo": payload.get("comparacao_tipo", "posicao")
    })
    if dominio_comum != sp.EmptySet:
        tipo_comp = payload.get("comparacao_tipo", "posicao")
        if tipo_comp == "velocidade":
            expr_a, expr_b, nome_comp = v, v_b, "vA(t) = vB(t)"
        else:
            expr_a, expr_b, nome_comp = x, x_b, "xA(t) = xB(t)"
        solucao = resolver_condicao(expr_a, expr_b, dominio_comum)
        resultado.update({
            "comparacao_nome": nome_comp,
            "comparacao_resultado_tipo": solucao["tipo"],
            "comparacao_exatas": solucao["exatas"],
            "comparacao_numericas": solucao["numericas"],
            "comparacao_texto": solucao["texto"]
        })

resultado_json = json.dumps(resultado, ensure_ascii=False)
`;


const PYTHON_VETORIAL_ENGINE = String.raw`
import json
import math
import numpy as np
import sympy as sp

from computa.cinematica.movimento import MovimentoVetorial
from computa.cinematica.analise import AnaliseMovimento
from computa.cinematica.eventos import EventosMovimento

payload = json.loads(payload_vetorial_json)

x = payload.get("x", "")
y = payload.get("y", "")
z = payload.get("z")
nome = payload.get("nome", "Partícula")

if not isinstance(x, str) or not x.strip():
    raise ValueError("Informe a função da posição no eixo x.")

if not isinstance(y, str) or not y.strip():
    raise ValueError("Informe a função da posição no eixo y.")

if z is not None and (not isinstance(z, str) or not z.strip()):
    z = None

t_inicial = float(payload.get("t_inicial", 0))
t_final = float(payload.get("t_final", 10))

if not math.isfinite(t_inicial) or not math.isfinite(t_final):
    raise ValueError("Os limites de tempo devem ser números finitos.")

if t_final <= t_inicial:
    raise ValueError("O tempo final deve ser maior que o inicial.")

pontos_grafico = int(payload.get("pontos_grafico", 301))
amostras_integracao = int(payload.get("amostras_integracao", 501))

if not 51 <= pontos_grafico <= 1001:
    raise ValueError("A quantidade de pontos do gráfico deve estar entre 51 e 1001.")

if not 101 <= amostras_integracao <= 2001:
    raise ValueError("A quantidade de amostras de integração deve estar entre 101 e 2001.")

movimento = MovimentoVetorial(
    x=x,
    y=y,
    z=z,
    t_inicial=t_inicial,
    t_final=t_final,
    nome=nome,
)

analise = AnaliseMovimento(movimento)
eventos = EventosMovimento(movimento)

def analisar_com_seguranca(funcao):
    try:
        return {
            "disponivel": True,
            "dados": funcao(),
            "mensagem": "",
        }
    except NotImplementedError as erro:
        return {
            "disponivel": False,
            "dados": None,
            "mensagem": str(erro),
        }

resumo = analise.resumo_intervalo(
    movimento.t_inicial,
    movimento.t_final,
    amostras=amostras_integracao,
)

eventos_eixo = analisar_com_seguranca(
    eventos.eventos_por_eixo
)

eventos_repouso = analisar_com_seguranca(
    eventos.eventos_repouso
)

extremos_rapidez = analisar_com_seguranca(
    eventos.extremos_rapidez
)

eixos = movimento.eixos

tempos = np.linspace(
    movimento.t_inicial,
    movimento.t_final,
    pontos_grafico,
)

amostras = {
    "tempo": [],
    "posicao": {eixo: [] for eixo in eixos},
    "velocidade": {eixo: [] for eixo in eixos},
    "aceleracao": {eixo: [] for eixo in eixos},
    "rapidez": [],
    "modulo_aceleracao": [],
}

for instante in tempos:
    estado = movimento.avaliar(float(instante))

    amostras["tempo"].append(float(instante))
    amostras["rapidez"].append(estado["rapidez"])
    amostras["modulo_aceleracao"].append(
        estado["modulo_aceleracao"]
    )

    for indice, eixo in enumerate(eixos):
        amostras["posicao"][eixo].append(
            estado["posicao"][indice]
        )
        amostras["velocidade"][eixo].append(
            estado["velocidade"][indice]
        )
        amostras["aceleracao"][eixo].append(
            estado["aceleracao"][indice]
        )

estado_inicial = movimento.avaliar(movimento.t_inicial)
estado_final = movimento.avaliar(movimento.t_final)

resultado = {
    "ok": True,
    "tipo_operacao": "vetorial",
    "nome": movimento.nome,
    "dimensao": movimento.dimensao,
    "eixos": list(eixos),
    "t_inicial": movimento.t_inicial,
    "t_final": movimento.t_final,

    "expressoes": {
        "posicao": {
            eixo: str(sp.factor(movimento.posicao[eixo]))
            for eixo in eixos
        },
        "velocidade": {
            eixo: str(sp.factor(movimento.velocidade[eixo]))
            for eixo in eixos
        },
        "aceleracao": {
            eixo: str(sp.factor(movimento.aceleracao[eixo]))
            for eixo in eixos
        },
    },

    "estado_inicial": estado_inicial,
    "estado_final": estado_final,
    "resumo": resumo,

    "eventos_por_eixo": eventos_eixo,
    "eventos_repouso": eventos_repouso,
    "extremos_rapidez": extremos_rapidez,

    "amostras": amostras,
}

resultado_json_vetorial = json.dumps(
    resultado,
    ensure_ascii=False,
    allow_nan=False,
)
`;

const ARQUIVOS_COMPUTA = [
    "python/computa/__init__.py",
    "python/computa/core/__init__.py",
    "python/computa/core/expressao.py",
    "python/computa/cinematica/__init__.py",
    "python/computa/cinematica/movimento.py",
    "python/computa/cinematica/analise.py",
    "python/computa/cinematica/eventos.py",
    "python/computa/dinamica/__init__.py",
];

async function carregarPacoteComputa() {
    const raizPython = "/home/pyodide";

    pyodide.FS.mkdirTree(`${raizPython}/computa/core`);
    pyodide.FS.mkdirTree(`${raizPython}/computa/cinematica`);
    pyodide.FS.mkdirTree(`${raizPython}/computa/dinamica`);

    for (const caminhoRelativo of ARQUIVOS_COMPUTA) {
        const url = new URL(caminhoRelativo, self.location.href);
        const resposta = await fetch(url);

        if (!resposta.ok) {
            throw new Error(
                `Falha ao carregar ${caminhoRelativo}: HTTP ${resposta.status}`
            );
        }

        const codigo = await resposta.text();
        const caminhoDestino = `${raizPython}/${caminhoRelativo.replace("python/", "")}`;

        pyodide.FS.writeFile(
            caminhoDestino,
            new TextEncoder().encode(codigo)
        );
    }

    await pyodide.runPythonAsync(`
import sys
if "/home/pyodide" not in sys.path:
    sys.path.insert(0, "/home/pyodide")

import computa
from computa.cinematica.movimento import MovimentoVetorial
from computa.cinematica.analise import AnaliseMovimento
from computa.cinematica.eventos import EventosMovimento
    `);
}

async function inicializar() {
    try {
        postMessage({
            tipo: "status",
            mensagem: "Carregando Python no navegador..."
        });

        importScripts(PYODIDE_URL);

        pyodide = await loadPyodide({
            indexURL: PYODIDE_INDEX
        });

        postMessage({
            tipo: "status",
            mensagem: "Carregando SymPy e NumPy..."
        });

        await pyodide.loadPackage("sympy");
        await pyodide.loadPackage("numpy");

        postMessage({
            tipo: "status",
            mensagem: "Carregando motor vetorial COMPUTA..."
        });

        await carregarPacoteComputa();

        pronto = true;

        postMessage({
            tipo: "ready"
        });

    } catch (erro) {
        postMessage({
            tipo: "fatal",
            mensagem: "Não foi possível inicializar o motor Python do COMPUTA.",
            detalhe: String(erro)
        });
    }
}

function extrairMensagemErro(erro, fallback) {
    const linhas = String(erro)
        .split("\n")
        .map(linha => linha.trim())
        .filter(Boolean);

    if (!linhas.length) {
        return fallback;
    }

    return linhas[linhas.length - 1]
        .replace(/^EntradaComplexaError:\s*/, "")
        .replace(/^ValueError:\s*/, "")
        .replace(/^NotImplementedError:\s*/, "")
        .replace(/^Error:\s*/, "")
        .trim() || fallback;
}

async function executarCalculo(id, payload) {
    if (!pronto || !pyodide) {
        postMessage({
            tipo: "erro",
            id,
            mensagem: "O motor de cálculo ainda não está pronto."
        });
        return;
    }

    try {
        pyodide.globals.set(
            "payload_json",
            JSON.stringify(payload)
        );

        await pyodide.runPythonAsync(PYTHON_ENGINE);

        const resultadoJson = pyodide.globals.get("resultado_json");

        postMessage({
            tipo: "resultado",
            id,
            dados: JSON.parse(resultadoJson)
        });

    } catch (erro) {
        const texto = String(erro);

        postMessage({
            tipo: "erro",
            id,
            mensagem: extrairMensagemErro(
                texto,
                "Não foi possível interpretar ou resolver os dados fornecidos."
            ),
            detalhe: texto
        });
    }
}

async function executarCalculoVetorial(id, payload) {
    if (!pronto || !pyodide) {
        postMessage({
            tipo: "erro",
            id,
            mensagem: "O motor vetorial ainda não está pronto."
        });
        return;
    }

    try {
        pyodide.globals.set(
            "payload_vetorial_json",
            JSON.stringify(payload)
        );

        await pyodide.runPythonAsync(PYTHON_VETORIAL_ENGINE);

        const resultadoJson = pyodide.globals.get(
            "resultado_json_vetorial"
        );

        postMessage({
            tipo: "resultado",
            id,
            dados: JSON.parse(resultadoJson)
        });

    } catch (erro) {
        const texto = String(erro);

        postMessage({
            tipo: "erro",
            id,
            mensagem: extrairMensagemErro(
                texto,
                "Não foi possível calcular o movimento vetorial."
            ),
            detalhe: texto
        });
    }
}

/*
 * Uma fila única evita que duas operações alterem simultaneamente
 * as variáveis globais compartilhadas pelo Pyodide.
 */
let filaExecucao = Promise.resolve();

onmessage = event => {
    const mensagem = event.data;

    if (!mensagem || !mensagem.id || !mensagem.payload) {
        return;
    }

    if (
        mensagem.tipo !== "calcular"
        && mensagem.tipo !== "calcular_vetorial"
    ) {
        return;
    }

    const tarefa = async () => {
        if (mensagem.tipo === "calcular") {
            await executarCalculo(
                mensagem.id,
                mensagem.payload
            );
        } else {
            await executarCalculoVetorial(
                mensagem.id,
                mensagem.payload
            );
        }
    };

    filaExecucao = filaExecucao
        .then(tarefa)
        .catch(erro => {
            postMessage({
                tipo: "erro",
                id: mensagem.id,
                mensagem: "Falha inesperada na fila de cálculo.",
                detalhe: String(erro)
            });
        });
};

inicializar();
