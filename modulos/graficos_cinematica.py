import numpy as np
import matplotlib.pyplot as plt
import sympy as sp

from modulos.movimento_1d import tempo


def _avaliar_vetor(movimento, grandeza, valores_t):
    saida = []

    for instante in valores_t:
        try:
            valor = movimento.avaliar(grandeza, float(instante))
            saida.append(float(sp.N(valor)))
        except Exception:
            saida.append(np.nan)

    return np.asarray(saida, dtype=float)


def gerar_graficos_movimento(movimento, t_inicial, t_final):
    valores_t = np.linspace(t_inicial, t_final, 1200)

    dados = [
        ("x", "Posição x Tempo", "Posição (m)"),
        ("v", "Velocidade x Tempo", "Velocidade (m/s)"),
        ("a", "Aceleração x Tempo", "Aceleração (m/s²)"),
    ]

    for grandeza, titulo, ylabel in dados:
        valores_y = _avaliar_vetor(movimento, grandeza, valores_t)

        plt.figure(figsize=(9, 5))
        plt.plot(valores_t, valores_y)
        plt.axhline(0, linewidth=0.8)

        for trecho in movimento.trechos[1:]:
            if t_inicial < trecho.inicio < t_final:
                plt.axvline(trecho.inicio, linestyle="--", alpha=0.35)

        plt.xlabel("Tempo (s)")
        plt.ylabel(ylabel)
        plt.title(f"{movimento.nome} — {titulo}")
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.show()


def gerar_grafico_comparativo(
    movimento1,
    movimento2,
    grandeza,
    t_inicial,
    t_final,
    eventos=None,
):
    valores_t = np.linspace(t_inicial, t_final, 1200)
    y1 = _avaliar_vetor(movimento1, grandeza, valores_t)
    y2 = _avaliar_vetor(movimento2, grandeza, valores_t)

    ylabel = "Posição (m)" if grandeza == "x" else "Velocidade (m/s)"

    plt.figure(figsize=(9, 5))
    plt.plot(valores_t, y1, label=movimento1.nome)
    plt.plot(valores_t, y2, label=movimento2.nome)

    for instante in eventos or []:
        try:
            valor = float(sp.N(movimento1.avaliar(grandeza, instante)))
        except Exception:
            continue

        plt.scatter([instante], [valor], s=60, zorder=5)
        plt.axvline(instante, linestyle="--", alpha=0.35)

    plt.axhline(0, linewidth=0.8)
    plt.xlabel("Tempo (s)")
    plt.ylabel(ylabel)
    plt.title("Comparação de movimentos")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.show()
