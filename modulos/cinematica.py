import numpy as np
import matplotlib.pyplot as plt
import sympy as sp

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