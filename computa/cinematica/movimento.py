
import math

import numpy as np
import sympy as sp

from computa.core.expressao import TEMPO, interpretar_expressao


class MovimentoVetorial:
    """
    Representa o movimento de uma partícula em duas ou três dimensões.

    As componentes da posição são funções do tempo:
        x(t), y(t) e, opcionalmente, z(t).

    Velocidade e aceleração são calculadas simbolicamente.
    """

    def __init__(
        self,
        x,
        y,
        z=None,
        t_inicial=0,
        t_final=10,
        nome="Partícula",
    ):
        if not (
            math.isfinite(float(t_inicial))
            and math.isfinite(float(t_final))
        ):
            raise ValueError("Os limites de tempo devem ser finitos.")

        if float(t_final) <= float(t_inicial):
            raise ValueError("O tempo final deve ser maior que o inicial.")

        self.nome = str(nome)
        self.t_inicial = float(t_inicial)
        self.t_final = float(t_final)

        entradas = {"x": x, "y": y}

        if z is not None:
            entradas["z"] = z

        self.posicao = {
            eixo: interpretar_expressao(expressao)
            for eixo, expressao in entradas.items()
        }

        self.dimensao = len(self.posicao)

        self.velocidade = {
            eixo: sp.diff(expressao, TEMPO)
            for eixo, expressao in self.posicao.items()
        }

        self.aceleracao = {
            eixo: sp.diff(expressao, TEMPO, 2)
            for eixo, expressao in self.posicao.items()
        }

    @property
    def eixos(self):
        return tuple(self.posicao.keys())

    def _validar_instante(self, t):
        t = float(t)

        if not math.isfinite(t):
            raise ValueError("O instante deve ser um número finito.")

        tolerancia = 1e-10

        if (
            t < self.t_inicial - tolerancia
            or t > self.t_final + tolerancia
        ):
            raise ValueError(
                f"t={t:g} s está fora do domínio "
                f"[{self.t_inicial:g}, {self.t_final:g}] s."
            )

        return t

    
    def _avaliar_vetor(self, expressoes, t):
        valores = []

        for eixo, expressao in expressoes.items():
            resultado = sp.simplify(
                expressao.subs(TEMPO, sp.Float(t))
            )
            resultado = sp.N(resultado, 15)

            # Primeiro verificamos singularidades e valores não finitos.
            if (
                resultado.has(sp.zoo, sp.nan, sp.oo, -sp.oo)
                or resultado.is_finite is False
            ):
                raise ValueError(
                    f"Singularidade ou resultado não finito "
                    f"no eixo {eixo}, em t={t:g} s."
                )

            # Depois verificamos se o resultado é real.
            if resultado.is_real is False:
                raise ValueError(
                    f"Resultado complexo no eixo {eixo}, "
                    f"em t={t:g} s."
                )

            try:
                valor = float(resultado)
            except (TypeError, ValueError, OverflowError) as erro:
                raise ValueError(
                    f"Não foi possível avaliar o eixo {eixo} "
                    f"em t={t:g} s."
                ) from erro

            if not math.isfinite(valor):
                raise ValueError(
                    f"Resultado não finito no eixo {eixo}, "
                    f"em t={t:g} s."
                )

            valores.append(valor)

        return tuple(valores)


    @staticmethod
    def _modulo(vetor):
        return math.sqrt(sum(componente**2 for componente in vetor))

    def avaliar(self, t):
        """Retorna posição, velocidade, aceleração e seus módulos."""

        t = self._validar_instante(t)

        r = self._avaliar_vetor(self.posicao, t)
        v = self._avaliar_vetor(self.velocidade, t)
        a = self._avaliar_vetor(self.aceleracao, t)

        return {
            "tempo": t,
            "posicao": r,
            "velocidade": v,
            "aceleracao": a,
            "rapidez": self._modulo(v),
            "modulo_aceleracao": self._modulo(a),
        }

    def deslocamento(self, t1, t2):
        """Retorna o vetor deslocamento entre dois instantes."""

        t1 = self._validar_instante(t1)
        t2 = self._validar_instante(t2)

        if t2 < t1:
            raise ValueError("O segundo instante deve ser maior ou igual ao primeiro.")

        r1 = self._avaliar_vetor(self.posicao, t1)
        r2 = self._avaliar_vetor(self.posicao, t2)

        return tuple(b - a for a, b in zip(r1, r2))

    def distancia_percorrida(self, t1, t2, amostras=2001):
        """
        Calcula numericamente a integral da rapidez no intervalo.

        Usa a regra dos trapézios. Aumentar amostras pode melhorar
        a aproximação, dependendo da regularidade do movimento.
        """

        t1 = self._validar_instante(t1)
        t2 = self._validar_instante(t2)

        if t2 < t1:
            raise ValueError("O segundo instante deve ser maior ou igual ao primeiro.")

        if not isinstance(amostras, int) or amostras < 2:
            raise ValueError("Use pelo menos duas amostras.")

        tempos = np.linspace(t1, t2, amostras)

        rapidez = []

        for instante in tempos:
            vetor_v = self._avaliar_vetor(
                self.velocidade,
                float(instante),
            )
            rapidez.append(self._modulo(vetor_v))

        return float(np.trapezoid(rapidez, tempos))

    
    def instantes_repouso(self):
        """
        Identifica os instantes em que todas as componentes da
        velocidade são simultaneamente nulas.

        Retorno:
            None: repouso durante todo o intervalo.
            []: nenhum instante de repouso.
            [t1, t2, ...]: instantes isolados de repouso.

        Se o SymPy não conseguir enumerar as soluções, informa
        que a análise simbólica precisa de tratamento adicional.
        """

        rapidez_ao_quadrado = sp.simplify(
            sum(
                componente**2
                for componente in self.velocidade.values()
            )
        )

        # Caso especial: todas as componentes da velocidade
        # são identicamente nulas.
        if rapidez_ao_quadrado == 0:
            return None

        conjunto = sp.solveset(
            rapidez_ao_quadrado,
            TEMPO,
            domain=sp.Interval(
                self.t_inicial,
                self.t_final,
            ),
        )

        if conjunto == sp.EmptySet:
            return []

        if not isinstance(conjunto, sp.FiniteSet):
            raise NotImplementedError(
                "O solver não conseguiu enumerar simbolicamente "
                "todos os instantes de repouso deste movimento."
            )

        resultados = []

        for raiz in conjunto:
            if raiz.is_real is False:
                continue

            valor = float(sp.N(raiz))

            if (
                self.t_inicial - 1e-9
                <= valor
                <= self.t_final + 1e-9
            ):
                resultados.append(valor)

        return sorted(resultados)

