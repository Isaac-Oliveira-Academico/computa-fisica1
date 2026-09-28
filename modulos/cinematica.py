import numpy as np
import matplotlib.pyplot as plt
import sympy as sp

from core.entrada import (
    escolher_opcao,
    ler_float,
    ler_float_opcional,
    ler_sim_nao,
    pausar,
)

from core.solver import resolver_equacoes_iterativamente


# ============================================================
# GRANDEZAS E EQUAÇÕES DO MUV
# ============================================================

x0 = sp.symbols("x0", real=True)
x = sp.symbols("x", real=True)
v0 = sp.symbols("v0", real=True)
v = sp.symbols("v", real=True)
a = sp.symbols("a", real=True)
t = sp.symbols("t", real=True)

# Usamos o mesmo símbolo t também na parte de funções.
tempo = t
tau = sp.symbols("tau", real=True)

SIMBOLOS = {
    "x0": x0,
    "x": x,
    "v0": v0,
    "v": v,
    "a": a,
    "t": t,
}

EQUACOES = [
    (
        "v = v0 + a*t",
        v - v0 - a * t,
    ),
    (
        "x = x0 + v0*t + 1/2*a*t²",
        x - x0 - v0 * t - sp.Rational(1, 2) * a * t**2,
    ),
    (
        "v² = v0² + 2*a*(x-x0)",
        v**2 - v0**2 - 2 * a * (x - x0),
    ),
    (
        "x = x0 + ((v0+v)/2)*t",
        x - x0 - ((v0 + v) / 2) * t,
    ),
]


# ============================================================
# VALIDAÇÃO DOS DADOS NUMÉRICOS
# ============================================================

def validar_dados_muv(conhecidos, tolerancia=1e-8):
    """
    Verifica se os valores fornecidos pelo usuário são compatíveis
    com as equações do MUV.

    Uma equação só é testada quando todas as grandezas que aparecem
    nela já foram informadas pelo usuário.
    """
    substituicoes = {
        SIMBOLOS[nome]: valor
        for nome, valor in conhecidos.items()
        if nome in SIMBOLOS
    }

    inconsistencias = []

    for nome_equacao, expressao in EQUACOES:
        simbolos_faltantes = (
            expressao.free_symbols
            - set(substituicoes.keys())
        )

        if simbolos_faltantes:
            continue

        residual = float(
            sp.N(
                expressao.subs(substituicoes)
            )
        )

        if abs(residual) > tolerancia:
            inconsistencias.append(
                {
                    "equacao": nome_equacao,
                    "residual": residual,
                }
            )

    return inconsistencias


# ============================================================
# GRÁFICOS DO MUV
# ============================================================

def gerar_graficos_muv(valores):
    """
    Gera os gráficos x(t), v(t) e a(t) para MUV.
    Requer x0, v0, a e t.
    """
    x0_val = valores["x0"]
    v0_val = valores["v0"]
    a_val = valores["a"]
    tempo_final = valores["t"]

    tempos = np.linspace(0, tempo_final, 1000)

    posicoes = (
        x0_val
        + v0_val * tempos
        + 0.5 * a_val * tempos**2
    )

    velocidades = (
        v0_val
        + a_val * tempos
    )

    aceleracoes = np.full_like(
        tempos,
        a_val,
        dtype=float,
    )

    graficos = [
        (
            posicoes,
            "Posição x Tempo",
            "Posição (m)",
        ),
        (
            velocidades,
            "Velocidade x Tempo",
            "Velocidade (m/s)",
        ),
        (
            aceleracoes,
            "Aceleração x Tempo",
            "Aceleração (m/s²)",
        ),
    ]

    for valores_y, titulo, ylabel in graficos:
        plt.figure(figsize=(9, 5))
        plt.plot(tempos, valores_y)
        plt.axhline(0, linewidth=0.8)
        plt.xlabel("Tempo (s)")
        plt.ylabel(ylabel)
        plt.title(titulo)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.show()


# ============================================================
# CINEMÁTICA SIMBÓLICA: x(t), v(t), a(t)
# ============================================================

def ler_expressao(nome):
    """
    Lê uma expressão matemática em função de t.

    Exemplos:
        4*t**2 + 3*t
        -8*t
        20 - 4*t**2
        sin(t)
        3*cos(2*t)

    Também aceita ^ e converte para **.
    """
    texto = input(
        f"\nDigite {nome}(t) em função de t.\n"
        f"Exemplo: 4*t**2 + 3*t - 2\n"
        f"{nome}(t) = "
    ).strip()

    texto = texto.replace("^", "**")

    permitidas = {
        "t": tempo,
        "sin": sp.sin,
        "cos": sp.cos,
        "tan": sp.tan,
        "sqrt": sp.sqrt,
        "exp": sp.exp,
        "pi": sp.pi,
    }

    try:
        expressao = sp.sympify(
            texto,
            locals=permitidas,
        )
        return sp.simplify(expressao)

    except (sp.SympifyError, SyntaxError, TypeError) as erro:
        raise ValueError(
            "Não foi possível interpretar a função."
        ) from erro


def construir_movimento(
    tipo,
    conhecida,
    t0=0.0,
    x0=None,
    v0=None,
):
    """
    Constrói x(t), v(t) e a(t).

    Se x(t) é conhecida:
        v = dx/dt
        a = dv/dt

    Se v(t) é conhecida:
        a = dv/dt
        x = x(t0) + integral de v

    Se a(t) é conhecida:
        v = v(t0) + integral de a
        x = x(t0) + integral de v
    """
    if tipo == "x":
        x_expr = sp.simplify(conhecida)
        v_expr = sp.simplify(
            sp.diff(x_expr, tempo)
        )
        a_expr = sp.simplify(
            sp.diff(v_expr, tempo)
        )

    elif tipo == "v":
        if x0 is None:
            raise ValueError(
                "Para integrar v(t), é necessário conhecer x(t0)."
            )

        v_expr = sp.simplify(conhecida)
        a_expr = sp.simplify(
            sp.diff(v_expr, tempo)
        )

        v_tau = v_expr.subs(
            tempo,
            tau,
        )

        x_expr = sp.simplify(
            x0
            + sp.integrate(
                v_tau,
                (tau, t0, tempo),
            )
        )

    elif tipo == "a":
        if x0 is None or v0 is None:
            raise ValueError(
                "Para integrar a(t), é necessário conhecer "
                "x(t0) e v(t0)."
            )

        a_expr = sp.simplify(conhecida)

        a_tau = a_expr.subs(
            tempo,
            tau,
        )

        v_expr = sp.simplify(
            v0
            + sp.integrate(
                a_tau,
                (tau, t0, tempo),
            )
        )

        v_tau = v_expr.subs(
            tempo,
            tau,
        )

        x_expr = sp.simplify(
            x0
            + sp.integrate(
                v_tau,
                (tau, t0, tempo),
            )
        )

    else:
        raise ValueError(
            "Tipo deve ser x, v ou a."
        )

    return (
        sp.simplify(x_expr),
        sp.simplify(v_expr),
        sp.simplify(a_expr),
    )


def avaliar_expressao(expressao, valores_t):
    """
    Converte uma expressão SymPy em função NumPy e a avalia
    para vários valores de tempo.
    """
    funcao = sp.lambdify(
        tempo,
        expressao,
        modules=["numpy"],
    )

    resultado = np.asarray(
        funcao(valores_t),
        dtype=float,
    )

    # Expressões constantes, como a(t)=2, retornam um escalar.
    if resultado.ndim == 0:
        resultado = np.full_like(
            valores_t,
            float(resultado),
            dtype=float,
        )

    return resultado


def gerar_graficos_funcoes(
    x_expr,
    v_expr,
    a_expr,
    t_inicial,
    t_final,
):
    """
    Gera os gráficos x(t), v(t) e a(t) para funções gerais.
    """
    valores_t = np.linspace(
        t_inicial,
        t_final,
        1000,
    )

    posicoes = avaliar_expressao(
        x_expr,
        valores_t,
    )

    velocidades = avaliar_expressao(
        v_expr,
        valores_t,
    )

    aceleracoes = avaliar_expressao(
        a_expr,
        valores_t,
    )

    graficos = [
        (
            posicoes,
            "Posição x Tempo",
            "Posição (m)",
        ),
        (
            velocidades,
            "Velocidade x Tempo",
            "Velocidade (m/s)",
        ),
        (
            aceleracoes,
            "Aceleração x Tempo",
            "Aceleração (m/s²)",
        ),
    ]

    for valores_y, titulo, ylabel in graficos:
        plt.figure(figsize=(9, 5))
        plt.plot(valores_t, valores_y)
        plt.axhline(0, linewidth=0.8)
        plt.xlabel("Tempo (s)")
        plt.ylabel(ylabel)
        plt.title(titulo)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.show()


# ============================================================
# INTERFACE: MUV NUMÉRICO
# ============================================================

def resolver_muv():
    print("\n" + "=" * 60)
    print("MOVIMENTO UNIDIMENSIONAL — MUV")
    print("=" * 60)

    print(
        "\nInforme apenas as grandezas que conhece.\n"
        "Se não souber, pressione ENTER.\n"
    )

    perguntas = {
        "x0": "Posição inicial x0 (m): ",
        "x": "Posição final x (m): ",
        "v0": "Velocidade inicial v0 (m/s): ",
        "v": "Velocidade final v (m/s): ",
        "a": "Aceleração a (m/s²): ",
        "t": "Tempo t (s): ",
    }

    conhecidos = {}

    for nome, mensagem in perguntas.items():
        valor = ler_float_opcional(
            mensagem
        )

        if valor is not None:
            conhecidos[nome] = valor

    # Antes de resolver, verificamos se os dados fornecidos
    # já contradizem alguma equação do MUV.
    inconsistencias = validar_dados_muv(
        conhecidos
    )

    if inconsistencias:
        print("\n" + "=" * 60)
        print("DADOS INCOMPATÍVEIS")
        print("=" * 60)

        print(
            "\nOs valores fornecidos não satisfazem "
            "o modelo de MUV."
        )

        print("\nEquações violadas:")

        for item in inconsistencias:
            print(
                f"- {item['equacao']} "
                f"(resíduo = {item['residual']:.6g})"
            )

        print(
            "\nRevise os dados do problema."
        )

        pausar()
        return

    valores, historico, ambiguidades = (
        resolver_equacoes_iterativamente(
            EQUACOES,
            SIMBOLOS,
            conhecidos,
        )
    )

    unidades = {
        "x0": "m",
        "x": "m",
        "v0": "m/s",
        "v": "m/s",
        "a": "m/s²",
        "t": "s",
    }

    print("\n" + "=" * 60)
    print("RESULTADOS")
    print("=" * 60)

    for nome in (
        "x0",
        "x",
        "v0",
        "v",
        "a",
        "t",
    ):
        if nome in valores:
            origem = (
                "informado"
                if nome in conhecidos
                else "calculado"
            )

            print(
                f"{nome:>2} = "
                f"{valores[nome]:.8g} "
                f"{unidades[nome]} "
                f"[{origem}]"
            )

    if historico:
        print("\nEQUAÇÕES UTILIZADAS")

        for passo in historico:
            print(
                f"- {passo['alvo']} "
                f"usando "
                f"{passo['equacao']}"
            )

    if ambiguidades:
        print("\nATENÇÃO:")
        print(
            "Alguma grandeza possui mais de uma "
            "solução matemática possível."
        )

        for nome, info in ambiguidades.items():
            print(
                f"{nome}: "
                f"{info['candidatos']}"
            )

    faltantes = [
        nome
        for nome in SIMBOLOS
        if nome not in valores
    ]

    if faltantes:
        print(
            "\nNão foi possível determinar automaticamente: "
            + ", ".join(faltantes)
        )

    dados_para_grafico = (
        "x0",
        "v0",
        "a",
        "t",
    )

    if all(
        nome in valores
        for nome in dados_para_grafico
    ):
        if ler_sim_nao(
            "\nDeseja gerar os gráficos?",
            padrao=False,
        ):
            gerar_graficos_muv(
                valores
            )

    pausar()


# ============================================================
# INTERFACE: FUNÇÃO CONHECIDA
# ============================================================

def resolver_funcao_conhecida():
    print("\n" + "=" * 60)
    print("MOVIMENTO RETILÍNEO — FUNÇÃO CONHECIDA")
    print("=" * 60)

    tipo = escolher_opcao(
        "\nQual função o problema fornece?",
        {
            "x": "Posição x(t)",
            "v": "Velocidade v(t)",
            "a": "Aceleração a(t)",
        },
    )

    try:
        conhecida = ler_expressao(
            tipo
        )
    except ValueError as erro:
        print(
            f"\nErro: {erro}"
        )
        pausar()
        return

    t0 = ler_float(
        "\nTempo inicial t0 (s): "
    )

    x0_val = None
    v0_val = None

    if tipo == "v":
        x0_val = ler_float(
            f"Posição x({t0:g}) (m): "
        )

    elif tipo == "a":
        x0_val = ler_float(
            f"Posição x({t0:g}) (m): "
        )

        v0_val = ler_float(
            f"Velocidade v({t0:g}) (m/s): "
        )

    try:
        (
            x_expr,
            v_expr,
            a_expr,
        ) = construir_movimento(
            tipo,
            conhecida,
            t0=t0,
            x0=x0_val,
            v0=v0_val,
        )

    except ValueError as erro:
        print(
            f"\nErro: {erro}"
        )
        pausar()
        return

    print("\n" + "=" * 60)
    print("FUNÇÕES OBTIDAS")
    print("=" * 60)

    print(
        f"x(t) = {sp.sstr(x_expr)}"
    )
    print(
        f"v(t) = {sp.sstr(v_expr)}"
    )
    print(
        f"a(t) = {sp.sstr(a_expr)}"
    )

    if ler_sim_nao(
        "\nDeseja avaliar o movimento "
        "em um instante específico?",
        padrao=False,
    ):
        t_avaliar = ler_float(
            "Instante t (s): "
        )

        x_valor = float(
            sp.N(
                x_expr.subs(
                    tempo,
                    t_avaliar,
                )
            )
        )

        v_valor = float(
            sp.N(
                v_expr.subs(
                    tempo,
                    t_avaliar,
                )
            )
        )

        a_valor = float(
            sp.N(
                a_expr.subs(
                    tempo,
                    t_avaliar,
                )
            )
        )

        print("\nNesse instante:")
        print(
            f"x = {x_valor:.8g} m"
        )
        print(
            f"v = {v_valor:.8g} m/s"
        )
        print(
            f"a = {a_valor:.8g} m/s²"
        )

    if ler_sim_nao(
        "\nDeseja gerar os gráficos?",
        padrao=False,
    ):
        t_inicial = ler_float(
            "Tempo inicial do gráfico (s): "
        )

        t_final = ler_float(
            "Tempo final do gráfico (s): "
        )

        if t_final <= t_inicial:
            print(
                "\nIntervalo inválido."
            )
        else:
            gerar_graficos_funcoes(
                x_expr,
                v_expr,
                a_expr,
                t_inicial,
                t_final,
            )

    pausar()


# ============================================================
# DUAS PARTÍCULAS
# ============================================================

def ler_particula(numero):
    """
    Lê os dados de uma partícula e retorna x(t), v(t), a(t).
    """
    print("\n" + "-" * 60)
    print(
        f"PARTÍCULA {numero}"
    )
    print("-" * 60)

    tipo = escolher_opcao(
        "\nQual função é conhecida?",
        {
            "x": "Posição x(t)",
            "v": "Velocidade v(t)",
            "a": "Aceleração a(t)",
        },
    )

    conhecida = ler_expressao(
        tipo
    )

    t0 = ler_float(
        "Tempo inicial t0 (s): "
    )

    x0_val = None
    v0_val = None

    if tipo == "v":
        x0_val = ler_float(
            f"Posição x({t0:g}) (m): "
        )

    elif tipo == "a":
        x0_val = ler_float(
            f"Posição x({t0:g}) (m): "
        )

        v0_val = ler_float(
            f"Velocidade v({t0:g}) (m/s): "
        )

    return construir_movimento(
        tipo,
        conhecida,
        t0=t0,
        x0=x0_val,
        v0=v0_val,
    )


def filtrar_solucoes_fisicas(
    solucoes,
    t_inicial,
    t_final,
):
    """
    Mantém soluções reais, numéricas, sem duplicação
    e dentro do intervalo escolhido.
    """
    validas = []

    for solucao in solucoes:
        solucao_numerica = sp.N(
            solucao
        )

        if solucao_numerica.is_real is False:
            continue

        try:
            valor = float(
                solucao_numerica
            )

        except (TypeError, ValueError):
            continue

        if (
            t_inicial
            <= valor
            <= t_final
        ):
            if not any(
                abs(
                    valor - existente
                ) < 1e-10
                for existente in validas
            ):
                validas.append(
                    valor
                )

    validas.sort()
    return validas


def resolver_duas_particulas():
    print("\n" + "=" * 60)
    print("MOVIMENTO E COMPARAÇÃO DE DUAS PARTÍCULAS")
    print("=" * 60)

    try:
        (
            x1,
            v1,
            a1,
        ) = ler_particula(1)

        (
            x2,
            v2,
            a2,
        ) = ler_particula(2)

    except Exception as erro:
        print(
            "\nErro ao construir o movimento: "
            f"{erro}"
        )
        pausar()
        return

    print("\n" + "=" * 60)
    print("FUNÇÕES OBTIDAS")
    print("=" * 60)

    print("\nPartícula 1:")
    print(
        f"x1(t) = {sp.sstr(x1)}"
    )
    print(
        f"v1(t) = {sp.sstr(v1)}"
    )
    print(
        f"a1(t) = {sp.sstr(a1)}"
    )

    print("\nPartícula 2:")
    print(
        f"x2(t) = {sp.sstr(x2)}"
    )
    print(
        f"v2(t) = {sp.sstr(v2)}"
    )
    print(
        f"a2(t) = {sp.sstr(a2)}"
    )

    evento = escolher_opcao(
        "\nO que deseja encontrar?",
        {
            "1": "Quando possuem a mesma posição",
            "2": "Quando possuem a mesma velocidade",
        },
    )

    t_inicial = ler_float(
        "\nTempo inicial da busca (s): "
    )

    t_final = ler_float(
        "Tempo final da busca (s): "
    )

    if t_final <= t_inicial:
        print(
            "\nIntervalo inválido."
        )
        pausar()
        return

    if evento == "1":
        equacao = sp.Eq(
            x1,
            x2,
        )

        grandeza1 = x1
        grandeza2 = x2

        ylabel = "Posição (m)"
        titulo = "Posição das duas partículas"
        unidade = "m"
        nome_evento = "mesma posição"

    else:
        equacao = sp.Eq(
            v1,
            v2,
        )

        grandeza1 = v1
        grandeza2 = v2

        ylabel = "Velocidade (m/s)"
        titulo = "Velocidade das duas partículas"
        unidade = "m/s"
        nome_evento = "mesma velocidade"

    print(
        "\nEquação resolvida:"
    )
    print(
        f"{sp.sstr(equacao)}"
    )

    try:
        solucoes = sp.solve(
            equacao,
            tempo,
        )
    except Exception as erro:
        print(
            "\nNão foi possível resolver simbolicamente "
            f"a equação: {erro}"
        )
        pausar()
        return

    solucoes_validas = filtrar_solucoes_fisicas(
        solucoes,
        t_inicial,
        t_final,
    )

    print("\n" + "=" * 60)
    print("RESULTADO")
    print("=" * 60)

    if not solucoes_validas:
        print(
            "\nNenhuma solução física foi encontrada "
            "no intervalo."
        )

    else:
        print(
            f"\nEvento: {nome_evento}"
        )

        for instante in solucoes_validas:
            valor_comum = float(
                sp.N(
                    grandeza1.subs(
                        tempo,
                        instante,
                    )
                )
            )

            print(
                f"\nt = {instante:.8g} s"
            )
            print(
                f"valor comum = "
                f"{valor_comum:.8g} {unidade}"
            )

    if ler_sim_nao(
        "\nDeseja gerar o gráfico comparativo?",
        padrao=False,
    ):
        valores_t = np.linspace(
            t_inicial,
            t_final,
            1000,
        )

        y1 = avaliar_expressao(
            grandeza1,
            valores_t,
        )

        y2 = avaliar_expressao(
            grandeza2,
            valores_t,
        )

        plt.figure(figsize=(9, 5))

        plt.plot(
            valores_t,
            y1,
            label="Partícula 1",
        )

        plt.plot(
            valores_t,
            y2,
            label="Partícula 2",
        )

        for instante in solucoes_validas:
            valor = float(
                sp.N(
                    grandeza1.subs(
                        tempo,
                        instante,
                    )
                )
            )

            plt.scatter(
                [instante],
                [valor],
                s=70,
                zorder=5,
                label=(
                    f"evento: t={instante:.3f} s"
                ),
            )

            plt.axvline(
                instante,
                linestyle="--",
                alpha=0.5,
            )

        plt.axhline(
            0,
            linewidth=0.8,
        )

        plt.xlabel(
            "Tempo (s)"
        )

        plt.ylabel(
            ylabel
        )

        plt.title(
            titulo
        )

        plt.grid(
            True,
            alpha=0.3,
        )

        plt.legend()
        plt.tight_layout()
        plt.show()

    pausar()


# ============================================================
# MENU DO MÓDULO DE CINEMÁTICA
# ============================================================

def menu_cinematica():
    while True:
        print("\n" + "=" * 60)
        print("CINEMÁTICA 1D")
        print("=" * 60)

        opcao = escolher_opcao(
            "\nComo o problema fornece os dados?",
            {
                "1": "Valores numéricos — MUV",
                "2": "Função x(t), v(t) ou a(t)",
                "3": "Movimento e comparação de duas partículas",
                "0": "Voltar",
            },
        )

        if opcao == "0":
            return

        if opcao == "1":
            resolver_muv()

        elif opcao == "2":
            resolver_funcao_conhecida()

        elif opcao == "3":
            resolver_duas_particulas()
