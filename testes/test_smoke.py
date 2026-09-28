import sys
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parents[1]

sys.path.insert(
    0,
    str(ROOT),
)


from core.solver import resolver_equacoes_iterativamente

from modulos.cinematica import (
    EQUACOES,
    SIMBOLOS,
    construir_movimento,
    filtrar_solucoes_fisicas,
    tempo,
    validar_dados_muv,
)


def teste_muv_numerico():
    conhecidos = {
        "x0": 0.0,
        "v0": 10.0,
        "a": 2.0,
        "t": 5.0,
    }

    valores, historico, ambiguidades = (
        resolver_equacoes_iterativamente(
            EQUACOES,
            SIMBOLOS,
            conhecidos,
        )
    )

    assert abs(
        valores["v"] - 20.0
    ) < 1e-10

    assert abs(
        valores["x"] - 75.0
    ) < 1e-10

    print(
        "OK 1 — MUV numérico: "
        "v = 20 m/s e x = 75 m"
    )


def teste_cinematica_simbolica():
    a_expr = -8 * tempo

    (
        x_expr,
        v_expr,
        a_resultado,
    ) = construir_movimento(
        "a",
        a_expr,
        t0=0,
        x0=0,
        v0=20,
    )

    assert sp.simplify(
        v_expr
        - (
            20
            - 4 * tempo**2
        )
    ) == 0

    assert sp.simplify(
        x_expr
        - (
            20 * tempo
            - sp.Rational(4, 3) * tempo**3
        )
    ) == 0

    assert sp.simplify(
        a_resultado
        - (-8 * tempo)
    ) == 0

    print(
        "OK 2 — Cinemática simbólica: "
        "derivação e integração funcionando"
    )


def teste_duas_particulas():
    x1 = (
        6 * tempo**2
        + 3 * tempo
        + 2
    )

    (
        x1_expr,
        v1_expr,
        a1_expr,
    ) = construir_movimento(
        "x",
        x1,
        t0=0,
    )

    (
        x2_expr,
        v2_expr,
        a2_expr,
    ) = construir_movimento(
        "a",
        -8 * tempo,
        t0=0,
        x0=0,
        v0=20,
    )

    solucoes = sp.solve(
        sp.Eq(
            v1_expr,
            v2_expr,
        ),
        tempo,
    )

    solucoes_validas = filtrar_solucoes_fisicas(
        solucoes,
        0,
        3,
    )

    assert len(
        solucoes_validas
    ) == 1

    t_evento = solucoes_validas[0]

    assert abs(
        t_evento
        - 1.0495097567963922
    ) < 1e-9

    v_evento = float(
        sp.N(
            v1_expr.subs(
                tempo,
                t_evento,
            )
        )
    )

    assert abs(
        v_evento
        - 15.594117081556707
    ) < 1e-9

    print(
        "OK 3 — Duas partículas: "
        f"mesma velocidade em "
        f"t = {t_evento:.6f} s"
    )


def teste_validacao_muv():
    inconsistencias = validar_dados_muv(
        {
            "x0": 1.0,
            "x": 1.0,
            "v0": 2.0,
            "v": 3.0,
            "a": 4.0,
            "t": 2.0,
        }
    )

    assert inconsistencias

    print(
        "OK 4 — Validação: "
        "dados incompatíveis detectados"
    )


def main():
    teste_muv_numerico()
    teste_cinematica_simbolica()
    teste_duas_particulas()
    teste_validacao_muv()

    print()
    print(
        "TODOS OS TESTES BÁSICOS PASSARAM."
    )


if __name__ == "__main__":
    main()
