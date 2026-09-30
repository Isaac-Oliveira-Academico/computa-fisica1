import sys
from pathlib import Path

import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from modulos.eventos_cinematica import (
    aceleracao_media,
    distancia_e_velocidade_escalar_media,
    deslocamento_e_velocidade_media,
    extremos,
    intervalos_de_sinal,
    resolver_evento,
)
from modulos.movimento_1d import (
    Movimento1D,
    TrechoMovimento,
    construir_movimento,
    criar_movimento_um_trecho,
    tempo,
)


def teste_eventos_halliday_2_20():
    # Halliday 10ª ed., cap. 2, problema 20:
    # x(t) = 20t - 5t^3
    movimento = criar_movimento_um_trecho(
        "x",
        20 * tempo - 5 * tempo**3,
        -2,
        2,
    )

    paradas = resolver_evento(movimento, "v", 0, -2, 2)
    aceleracao_zero = resolver_evento(movimento, "a", 0, -2, 2)

    esperado = 2 / sp.sqrt(3)
    esperado = float(sp.N(esperado))

    assert len(paradas["pontos"]) == 2
    assert abs(paradas["pontos"][0] + esperado) < 1e-9
    assert abs(paradas["pontos"][1] - esperado) < 1e-9
    assert aceleracao_zero["pontos"] == [0.0]

    print("OK C2.1 — Halliday 2.20: raízes de v(t) e a(t)")


def teste_extremos_halliday_2_18():
    # x(t)=12t^2-2t^3: máximo x=64 em t=4; máximo v=24 em t=2.
    movimento = criar_movimento_um_trecho(
        "x",
        12 * tempo**2 - 2 * tempo**3,
        0,
        5,
    )

    ex = extremos(movimento, "x", 0, 5)
    ev = extremos(movimento, "v", 0, 5)

    max_x = ex["maximo"][0]
    max_v = ev["maximo"][0]

    assert abs(max_x["t"] - 4.0) < 1e-9
    assert abs(max_x["valor"] - 64.0) < 1e-9
    assert abs(max_v["t"] - 2.0) < 1e-9
    assert abs(max_v["valor"] - 24.0) < 1e-9

    media = deslocamento_e_velocidade_media(movimento, 0, 3)
    assert abs(media["velocidade_media"] - 18.0) < 1e-9

    print("OK C2.2 — Extremos e velocidade média")


def teste_distancia_com_inversao():
    # x=3t^2-2t^3: entre 0 e 4 s, distância total = 82 m.
    movimento = criar_movimento_um_trecho(
        "x",
        3 * tempo**2 - 2 * tempo**3,
        0,
        4,
    )

    resultado = distancia_e_velocidade_escalar_media(
        movimento,
        0,
        4,
    )

    assert abs(resultado["distancia"] - 82.0) < 1e-9
    assert abs(resultado["velocidade_escalar_media"] - 20.5) < 1e-9
    assert any(abs(t - 1.0) < 1e-9 for t in resultado["pontos_retorno"])

    print("OK C2.3 — Distância total com inversão de movimento")


def teste_piecewise_halliday_2_21():
    # 0..300 s: parado em x=0
    # 300..600 s: v=2.2 m/s e x(300)=0
    x1, v1, a1 = construir_movimento("x", sp.Integer(0))
    x2, v2, a2 = construir_movimento(
        "v",
        sp.Rational(11, 5),
        t0=300,
        x0=0,
    )

    movimento = Movimento1D(
        [
            TrechoMovimento(0, 300, x1, v1, a1),
            TrechoMovimento(300, 600, x2, v2, a2),
        ]
    )

    medias = deslocamento_e_velocidade_media(movimento, 120, 480)
    a_med = aceleracao_media(movimento, 120, 480)

    assert abs(medias["velocidade_media"] - 1.1) < 1e-9
    assert abs(a_med - (2.2 / 360.0)) < 1e-12

    parado = resolver_evento(movimento, "v", 0, 0, 600)
    assert len(parado["intervalos"]) == 1
    assert parado["intervalos"][0].left == 0
    assert parado["intervalos"][0].right == 300
    assert bool(parado["intervalos"][0].right_open) is True

    assert movimento.validar_continuidade()[0]["tipo"] == "velocidade"

    print("OK C2.4 — Piecewise: repouso + movimento uniforme")


def teste_intervalos_de_sinal_halliday_2_20():
    # x(t)=20t-5t^3 no domínio [-2,2].
    # v=20-15t² muda de sinal em ±2/sqrt(3); a=-30t muda em 0.
    movimento = criar_movimento_um_trecho(
        "x",
        20 * tempo - 5 * tempo**3,
        -2,
        2,
    )

    sinais_v = intervalos_de_sinal(movimento, "v", -2, 2)
    sinais_a = intervalos_de_sinal(movimento, "a", -2, 2)

    assert sinais_v["limitacoes"] == []
    assert sinais_a["limitacoes"] == []

    positivos_v = sp.Union(*sinais_v["positivos"])
    negativos_v = sp.Union(*sinais_v["negativos"])
    positivos_a = sp.Union(*sinais_a["positivos"])
    negativos_a = sp.Union(*sinais_a["negativos"])

    assert bool(positivos_v.contains(sp.Integer(0)))
    assert bool(negativos_v.contains(sp.Rational(3, 2)))
    assert bool(negativos_v.contains(sp.Rational(-3, 2)))

    assert bool(positivos_a.contains(sp.Integer(-1)))
    assert bool(negativos_a.contains(sp.Integer(1)))

    assert any(abs(float(z)) < 1e-12 for z in sinais_a["zeros"])

    print("OK C2.5 — Intervalos de sinal de v(t) e a(t)")


def main():
    teste_eventos_halliday_2_20()
    teste_extremos_halliday_2_18()
    teste_distancia_com_inversao()
    teste_piecewise_halliday_2_21()
    teste_intervalos_de_sinal_halliday_2_20()
    print()
    print("TODOS OS TESTES DO MOTOR DO CAPÍTULO 2 PASSARAM.")


if __name__ == "__main__":
    main()
