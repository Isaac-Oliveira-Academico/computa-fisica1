import numpy as np
import matplotlib.pyplot as plt
import sympy as sp
from core.entrada import (
    escolher_opcao,
    ler_float,
    ler_float_opcional,
    ler_sim_nao,
    pausar
)

from core.entrada import (
    ler_float_opcional,
    pausar
)

from core.solver import (
    resolver_equacoes_iterativamente
)


# ============================================================
# GRANDEZAS
# ============================================================

x0 = sp.symbols(
    "x0",
    real=True
)

x = sp.symbols(
    "x",
    real=True
)

v0 = sp.symbols(
    "v0",
    real=True
)

v = sp.symbols(
    "v",
    real=True
)

a = sp.symbols(
    "a",
    real=True
)

t = sp.symbols(
    "t",
    real=True
)


SIMBOLOS = {

    "x0": x0,
    "x": x,

    "v0": v0,
    "v": v,

    "a": a,

    "t": t,
}


# ============================================================
# EQUAÇÕES DO MUV
# ============================================================

EQUACOES = [

    (
        "v = v0 + a*t",

        v
        - v0
        - a*t
    ),

    (
        "x = x0 + v0*t + 1/2*a*t²",

        x
        - x0
        - v0*t
        - sp.Rational(1, 2)
        * a
        * t**2
    ),

    (
        "v² = v0² + 2*a*(x-x0)",

        v**2
        - v0**2
        - 2*a
        * (x - x0)
    ),

    (
        "x = x0 + ((v0+v)/2)*t",

        x
        - x0
        - (
            (v0 + v)
            / 2
        )
        * t
    ),
]

def gerar_graficos_muv(valores):
    """
    Gera os gráficos:

    x(t) -> posição
    v(t) -> velocidade
    a(t) -> aceleração

    Só pode ser usada se conhecermos:
    x0, v0, a e t.
    """

    x0 = valores["x0"]
    v0 = valores["v0"]
    a = valores["a"]
    tempo_final = valores["t"]

    # 1000 pontos entre t = 0
    # e o tempo final.
    tempos = np.linspace(
        0,
        tempo_final,
        1000
    )

    # Equação horária da posição.
    posicoes = (
        x0
        + v0 * tempos
        + 0.5 * a * tempos**2
    )

    # Equação da velocidade.
    velocidades = (
        v0
        + a * tempos
    )

    # A aceleração é constante no MUV.
    aceleracoes = np.full_like(
        tempos,
        a
    )

    # ----------------------------------------
    # GRÁFICO 1 — posição
    # ----------------------------------------

    plt.figure(
        figsize=(9, 5)
    )

    plt.plot(
        tempos,
        posicoes
    )

    plt.xlabel(
        "Tempo (s)"
    )

    plt.ylabel(
        "Posição (m)"
    )

    plt.title(
        "Posição x Tempo"
    )

    plt.grid()

    plt.show()

    # ----------------------------------------
    # GRÁFICO 2 — velocidade
    # ----------------------------------------

    plt.figure(
        figsize=(9, 5)
    )

    plt.plot(
        tempos,
        velocidades
    )

    plt.xlabel(
        "Tempo (s)"
    )

    plt.ylabel(
        "Velocidade (m/s)"
    )

    plt.title(
        "Velocidade x Tempo"
    )

    plt.grid()

    plt.show()

    # ----------------------------------------
    # GRÁFICO 3 — aceleração
    # ----------------------------------------

    plt.figure(
        figsize=(9, 5)
    )

    plt.plot(
        tempos,
        aceleracoes
    )

    plt.xlabel(
        "Tempo (s)"
    )

    plt.ylabel(
        "Aceleração (m/s²)"
    )

    plt.title(
        "Aceleração x Tempo"
    )

    plt.grid()

    plt.show()

# ============================================================
# CINEMÁTICA COM FUNÇÕES x(t), v(t) OU a(t)
# ============================================================

tempo = sp.symbols(
    "t",
    real=True
)

tau = sp.symbols(
    "tau",
    real=True
)

def ler_expressao(
    nome
):
    """
    Lê uma expressão matemática digitada pelo usuário.

    Exemplos aceitos:

    4*t**2 + 3*t
    -8*t
    20 - 4*t**2
    sin(t)
    3*cos(2*t)

    Também aceitamos ^ e transformamos em **.
    """

    texto = input(
        f"\nDigite {nome}(t) em função de t.\n"
        f"Exemplo: 4*t**2 + 3*t - 2\n"
        f"{nome}(t) = "
    ).strip()

    texto = texto.replace(
        "^",
        "**"
    )

    permitidas = {

        "t":
            tempo,

        "sin":
            sp.sin,

        "cos":
            sp.cos,

        "tan":
            sp.tan,

        "sqrt":
            sp.sqrt,

        "exp":
            sp.exp,

        "pi":
            sp.pi,
    }

    try:

        expressao = sp.sympify(
            texto,
            locals=permitidas
        )

        return sp.simplify(
            expressao
        )

    except (
        sp.SympifyError,
        SyntaxError
    ):

        raise ValueError(
            "Não foi possível "
            "interpretar a função."
        )

def construir_movimento(
    tipo,
    conhecida,
    t0=0.0,
    x0=None,
    v0=None
):
    """
    Constrói x(t), v(t) e a(t).

    Caso 1:
        conhecemos x(t)
        -> derivamos para encontrar v(t)
        -> derivamos novamente para a(t)

    Caso 2:
        conhecemos v(t)
        -> derivamos para encontrar a(t)
        -> integramos para encontrar x(t)

    Caso 3:
        conhecemos a(t)
        -> integramos para encontrar v(t)
        -> integramos novamente para x(t)
    """

    # ========================================================
    # POSIÇÃO CONHECIDA
    # ========================================================

    if tipo == "x":

        x_expr = sp.simplify(
            conhecida
        )

        v_expr = sp.simplify(
            sp.diff(
                x_expr,
                tempo
            )
        )

        a_expr = sp.simplify(
            sp.diff(
                v_expr,
                tempo
            )
        )

    # ========================================================
    # VELOCIDADE CONHECIDA
    # ========================================================

    elif tipo == "v":

        if x0 is None:

            raise ValueError(
                "Para integrar v(t), "
                "é necessário conhecer x(t0)."
            )

        v_expr = sp.simplify(
            conhecida
        )

        a_expr = sp.simplify(
            sp.diff(
                v_expr,
                tempo
            )
        )

        v_tau = v_expr.subs(
            tempo,
            tau
        )

        x_expr = sp.simplify(

            x0

            + sp.integrate(
                v_tau,
                (
                    tau,
                    t0,
                    tempo
                )
            )
        )

    # ========================================================
    # ACELERAÇÃO CONHECIDA
    # ========================================================

    elif tipo == "a":

        if (
            x0 is None
            or v0 is None
        ):

            raise ValueError(
                "Para integrar a(t), "
                "é necessário conhecer "
                "x(t0) e v(t0)."
            )

        a_expr = sp.simplify(
            conhecida
        )

        a_tau = a_expr.subs(
            tempo,
            tau
        )

        v_expr = sp.simplify(

            v0

            + sp.integrate(
                a_tau,
                (
                    tau,
                    t0,
                    tempo
                )
            )
        )

        v_tau = v_expr.subs(
            tempo,
            tau
        )

        x_expr = sp.simplify(

            x0

            + sp.integrate(
                v_tau,
                (
                    tau,
                    t0,
                    tempo
                )
            )
        )

    else:

        raise ValueError(
            "Tipo deve ser x, v ou a."
        )

    return (
        x_expr,
        v_expr,
        a_expr
    )

def avaliar_expressao(
    expressao,
    valores_t
):
    """
    Transforma expressão SymPy
    em função NumPy e a avalia.
    """

    funcao = sp.lambdify(
        tempo,
        expressao,
        modules=["numpy"]
    )

    resultado = np.asarray(
        funcao(
            valores_t
        ),
        dtype=float
    )

    # Se a expressão for constante,
    # por exemplo a(t)=2,
    # o resultado inicialmente é apenas um número.

    if resultado.ndim == 0:

        resultado = np.full_like(
            valores_t,
            float(resultado),
            dtype=float
        )

    return resultado

def gerar_graficos_funcoes(
    x_expr,
    v_expr,
    a_expr,
    t_inicial,
    t_final
):
    """
    Gera x(t), v(t) e a(t)
    em um intervalo escolhido.
    """

    valores_t = np.linspace(
        t_inicial,
        t_final,
        1000
    )

    posicoes = avaliar_expressao(
        x_expr,
        valores_t
    )

    velocidades = avaliar_expressao(
        v_expr,
        valores_t
    )

    aceleracoes = avaliar_expressao(
        a_expr,
        valores_t
    )

    graficos = [

        (
            posicoes,
            "Posição x Tempo",
            "Posição (m)"
        ),

        (
            velocidades,
            "Velocidade x Tempo",
            "Velocidade (m/s)"
        ),

        (
            aceleracoes,
            "Aceleração x Tempo",
            "Aceleração (m/s²)"
        )
    ]

    for (
        valores_y,
        titulo,
        ylabel
    ) in graficos:

        plt.figure(
            figsize=(9, 5)
        )

        plt.plot(
            valores_t,
            valores_y
        )

        plt.axhline(
            0,
            linewidth=0.8
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

        plt.grid()

        plt.show()

def resolver_funcao_conhecida():

    print(
        "\n"
        + "=" * 60
    )

    print(
        "MOVIMENTO RETILÍNEO — FUNÇÃO CONHECIDA"
    )

    print(
        "=" * 60
    )

    tipo = escolher_opcao(

        "\nQual função o problema fornece?",

        {
            "x":
                "Posição x(t)",

            "v":
                "Velocidade v(t)",

            "a":
                "Aceleração a(t)",
        }
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

    # --------------------------------------------------------
    # Condição inicial
    # --------------------------------------------------------

    t0 = ler_float(
        "\nTempo inicial t0 (s): "
    )

    x0 = None
    v0 = None

    if tipo == "v":

        x0 = ler_float(
            f"Posição x({t0:g}) (m): "
        )

    elif tipo == "a":

        x0 = ler_float(
            f"Posição x({t0:g}) (m): "
        )

        v0 = ler_float(
            f"Velocidade v({t0:g}) (m/s): "
        )

    try:

        (
            x_expr,
            v_expr,
            a_expr
        ) = construir_movimento(

            tipo,
            conhecida,
            t0=t0,
            x0=x0,
            v0=v0
        )

    except ValueError as erro:

        print(
            f"\nErro: {erro}"
        )

        pausar()

        return

    # --------------------------------------------------------
    # Mostrar modelo obtido
    # --------------------------------------------------------

    print(
        "\n"
        + "=" * 60
    )

    print(
        "FUNÇÕES OBTIDAS"
    )

    print(
        "=" * 60
    )

    print(
        f"x(t) = "
        f"{sp.sstr(x_expr)}"
    )

    print(
        f"v(t) = "
        f"{sp.sstr(v_expr)}"
    )

    print(
        f"a(t) = "
        f"{sp.sstr(a_expr)}"
    )

    # --------------------------------------------------------
    # Avaliação em um instante
    # --------------------------------------------------------

    if ler_sim_nao(
        "\nDeseja avaliar o movimento "
        "em um instante específico?"
    ):

        t_avaliar = ler_float(
            "Instante t (s): "
        )

        x_valor = float(
            x_expr.subs(
                tempo,
                t_avaliar
            )
        )

        v_valor = float(
            v_expr.subs(
                tempo,
                t_avaliar
            )
        )

        a_valor = float(
            a_expr.subs(
                tempo,
                t_avaliar
            )
        )

        print(
            "\nNesse instante:"
        )

        print(
            f"x = "
            f"{x_valor:.8g} m"
        )

        print(
            f"v = "
            f"{v_valor:.8g} m/s"
        )

        print(
            f"a = "
            f"{a_valor:.8g} m/s²"
        )

    # --------------------------------------------------------
    # Gráficos
    # --------------------------------------------------------

    if ler_sim_nao(
        "\nDeseja gerar os gráficos?"
    ):

        t_inicial = ler_float(
            "Tempo inicial do gráfico (s): "
        )

        t_final = ler_float(
            "Tempo final do gráfico (s): "
        )

        if t_final <= t_inicial:

            print(
                "Intervalo inválido."
            )

        else:

            gerar_graficos_funcoes(
                x_expr,
                v_expr,
                a_expr,
                t_inicial,
                t_final
            )

    pausar()  

# ============================================================
# INTERFACE
# ============================================================

def resolver_muv():

    print(
        "\n"
        + "=" * 60
    )

    print(
        "MOVIMENTO UNIDIMENSIONAL — MUV"
    )

    print(
        "=" * 60
    )

    print(
        "\nInforme apenas "
        "as grandezas que conhece."
    )

    print(
        "Se não souber, "
        "pressione ENTER.\n"
    )

    perguntas = {

        "x0":
            "Posição inicial x0 (m): ",

        "x":
            "Posição final x (m): ",

        "v0":
            "Velocidade inicial v0 (m/s): ",

        "v":
            "Velocidade final v (m/s): ",

        "a":
            "Aceleração a (m/s²): ",

        "t":
            "Tempo t (s): ",
    }

    conhecidos = {}

    for (
        nome,
        mensagem
    ) in perguntas.items():

        valor = (
            ler_float_opcional(
                mensagem
            )
        )

        if valor is not None:

            conhecidos[
                nome
            ] = valor

    valores, historico, ambiguidades = (
        resolver_equacoes_iterativamente(
            EQUACOES,
            SIMBOLOS,
            conhecidos
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

    print(
        "\n"
        + "=" * 60
    )

    print(
        "RESULTADOS"
    )

    print(
        "=" * 60
    )

    for nome in (
        "x0",
        "x",
        "v0",
        "v",
        "a",
        "t"
    ):

        if nome in valores:

            if nome in conhecidos:

                origem = (
                    "informado"
                )

            else:

                origem = (
                    "calculado"
                )

            print(
                f"{nome:>2} = "
                f"{valores[nome]:.8g} "
                f"{unidades[nome]} "
                f"[{origem}]"
            )

    if historico:

        print(
            "\nEQUAÇÕES UTILIZADAS"
        )

        for passo in historico:

            print(
                f"- {passo['alvo']} "
                f"usando "
                f"{passo['equacao']}"
            )

    if ambiguidades:

        print(
            "\nATENÇÃO:"
        )

        print(
            "Alguma grandeza possui "
            "mais de uma solução possível."
        )

        for (
            nome,
            info
        ) in ambiguidades.items():

            print(
                f"{nome}: "
                f"{info['candidatos']}"
            )

    dados_para_grafico = (
        "x0",
        "v0",
        "a",
        "t"
    )

    if all(
        nome in valores
        for nome in dados_para_grafico
    ):

        resposta = input(
            "\nDeseja gerar os gráficos? [s/n]: "
        ).strip().lower()

        if resposta == "s":

            gerar_graficos_muv(
                valores
            )
            
    pausar()

# ============================================================
# DUAS PARTÍCULAS
# ============================================================

def ler_particula(numero):
    """
    Lê os dados de uma partícula.

    A partícula pode ser definida por:
    x(t), v(t) ou a(t).

    Retorna:
    x(t), v(t), a(t)
    """

    print(
        "\n"
        + "-" * 60
    )

    print(
        f"PARTÍCULA {numero}"
    )

    print(
        "-" * 60
    )

    tipo = escolher_opcao(

        "\nQual função é conhecida?",

        {
            "x":
                "Posição x(t)",

            "v":
                "Velocidade v(t)",

            "a":
                "Aceleração a(t)",
        }
    )

    conhecida = ler_expressao(
        tipo
    )

    t0 = ler_float(
        "Tempo inicial t0 (s): "
    )

    x0 = None
    v0 = None

    if tipo == "v":

        x0 = ler_float(
            f"Posição x({t0:g}) (m): "
        )

    elif tipo == "a":

        x0 = ler_float(
            f"Posição x({t0:g}) (m): "
        )

        v0 = ler_float(
            f"Velocidade v({t0:g}) (m/s): "
        )

    return construir_movimento(
        tipo,
        conhecida,
        t0=t0,
        x0=x0,
        v0=v0
    )

def filtrar_solucoes_fisicas(
    solucoes,
    t_inicial,
    t_final
):
    """
    Mantém apenas soluções:

    - reais;
    - numéricas;
    - dentro do intervalo escolhido.
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

        except (
            TypeError,
            ValueError
        ):

            continue

        if (
            t_inicial
            <= valor
            <= t_final
        ):

            validas.append(
                valor
            )

    validas.sort()

    return validas

def resolver_duas_particulas():

    print(
        "\n"
        + "=" * 60
    )

    print(
        "MOVIMENTO DE DUAS PARTÍCULAS"
    )

    print(
        "=" * 60
    )

    try:

        (
            x1,
            v1,
            a1
        ) = ler_particula(1)

        (
            x2,
            v2,
            a2
        ) = ler_particula(2)

    except Exception as erro:

        print(
            f"\nErro ao construir "
            f"o movimento: {erro}"
        )

        pausar()

        return

    print(
        "\n"
        + "=" * 60
    )

    print(
        "FUNÇÕES OBTIDAS"
    )

    print(
        "=" * 60
    )

    print(
        "\nPartícula 1:"
    )

    print(
        f"x1(t) = {sp.sstr(x1)}"
    )

    print(
        f"v1(t) = {sp.sstr(v1)}"
    )

    print(
        f"a1(t) = {sp.sstr(a1)}"
    )

    print(
        "\nPartícula 2:"
    )

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
            "1":
                "Quando possuem a mesma posição",

            "2":
                "Quando possuem a mesma velocidade",
        }
    )

    t_inicial = ler_float(
        "\nTempo inicial da busca (s): "
    )

    t_final = ler_float(
        "Tempo final da busca (s): "
    )

    if (
        t_final
        <= t_inicial
    ):

        print(
            "\nIntervalo inválido."
        )

        pausar()

        return

    if evento == "1":

        equacao = sp.Eq(
            x1,
            x2
        )

        grandeza1 = x1
        grandeza2 = x2

        ylabel = (
            "Posição (m)"
        )

        titulo = (
            "Posição das duas partículas"
        )

    else:

        equacao = sp.Eq(
            v1,
            v2
        )

        grandeza1 = v1
        grandeza2 = v2

        ylabel = (
            "Velocidade (m/s)"
        )

        titulo = (
            "Velocidade das duas partículas"
        )

    solucoes = sp.solve(
        equacao,
        tempo
    )

    solucoes_validas = (
        filtrar_solucoes_fisicas(
            solucoes,
            t_inicial,
            t_final
        )
    )

    print(
        "\n"
        + "=" * 60
    )

    print(
        "RESULTADO"
    )

    print(
        "=" * 60
    )

    if not solucoes_validas:

        print(
            "\nNenhuma solução física "
            "foi encontrada no intervalo."
        )

    else:

        for instante in solucoes_validas:

            valor1 = float(

                grandeza1.subs(
                    tempo,
                    instante
                )
            )

            print(
                f"\nt = "
                f"{instante:.8g} s"
            )

            print(
                f"valor comum = "
                f"{valor1:.8g}"
            )

    # ========================================================
    # GRÁFICO
    # ========================================================

    if ler_sim_nao(
        "\nDeseja gerar o gráfico?"
    ):

        valores_t = np.linspace(
            t_inicial,
            t_final,
            1000
        )

        y1 = avaliar_expressao(
            grandeza1,
            valores_t
        )

        y2 = avaliar_expressao(
            grandeza2,
            valores_t
        )

        plt.figure(
            figsize=(9, 5)
        )

        plt.plot(
            valores_t,
            y1,
            label="Partícula 1"
        )

        plt.plot(
            valores_t,
            y2,
            label="Partícula 2"
        )

        for instante in solucoes_validas:

            valor = float(

                grandeza1.subs(
                    tempo,
                    instante
                )
            )

            plt.scatter(
                instante,
                valor
            )

            plt.axvline(
                instante,
                linestyle="--",
                alpha=0.5
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

        plt.grid()

        plt.legend()

        plt.show()

    pausar()

def menu_cinematica():

    while True:

        print(
            "\n"
            + "=" * 60
        )

        print(
            "CINEMÁTICA 1D"
        )

        print(
            "=" * 60
        )

        opcao = escolher_opcao(

            "\nComo o problema fornece os dados?",

           {
                "1":
                    "Valores numéricos — MUV",

                "2":
                    "Função x(t), v(t) ou a(t)",

                "3":
                    "Duas partículas",

                "0":
                    "Voltar",
            }
            
        )

        if opcao == "0":

            return

        elif opcao == "1":

            resolver_muv()

        elif opcao == "2":

            resolver_funcao_conhecida()
        
        elif opcao == "3":

            resolver_duas_particulas()