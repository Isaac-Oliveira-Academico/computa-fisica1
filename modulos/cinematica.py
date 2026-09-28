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

    pausar()