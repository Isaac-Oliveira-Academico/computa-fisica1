
import math

import sympy as sp

from computa.core.expressao import TEMPO


class EventosMovimento:
    """
    Identifica eventos relevantes da cinemática de um movimento vetorial.

    Métodos:
    - eventos_por_eixo(): zeros das componentes da velocidade.
    - eventos_repouso(): instantes de repouso vetorial.
    - extremos_rapidez(): máximos e mínimos locais da rapidez.

    Em eventos_por_eixo(), maximo e minimo representam extremos
    da coordenada da posição correspondente ao eixo.
    """

    def __init__(self, movimento):
        self.movimento = movimento

    @staticmethod
    def _avaliar_real(expressao, instante):
        """
        Avalia uma expressão em um instante.

        Retorna float finito ou None se não for possível obter
        um resultado real e finito.
        """
        resultado = sp.N(
            expressao.subs(TEMPO, sp.Float(instante)),
            15,
        )

        if (
            resultado.has(sp.zoo, sp.nan, sp.oo, -sp.oo)
            or resultado.is_finite is False
            or resultado.is_real is False
        ):
            return None

        try:
            valor = float(resultado)
        except (TypeError, ValueError, OverflowError):
            return None

        if not math.isfinite(valor):
            return None

        return valor

    def _escala_expressao(self, expressao):
        """
        Estima a escala numérica da expressão no domínio.

        A escala é usada para avaliar resíduos nas fronteiras
        sem confundir expressões pequenas, mas não nulas,
        com raízes.
        """
        inicio = self.movimento.t_inicial
        fim = self.movimento.t_final

        pontos = [
            inicio,
            inicio + (fim - inicio) * 0.25,
            (inicio + fim) / 2,
            inicio + (fim - inicio) * 0.75,
            fim,
        ]

        valores = []

        for ponto in pontos:
            valor = self._avaliar_real(expressao, ponto)

            if valor is not None:
                valores.append(abs(valor))

        return max(valores, default=0.0)

    def _raizes_no_intervalo(self, expressao):
        """
        Retorna raízes reais isoladas dentro do domínio.

        Retorno:
        - None: expressão identicamente nula.
        - []: nenhuma raiz encontrada.
        - [t1, t2, ...]: raízes reais isoladas.

        A verificação das fronteiras usa tolerância relativa
        à escala numérica da expressão.
        """
        expressao = sp.simplify(expressao)

        if expressao == 0:
            return None

        inicio = self.movimento.t_inicial
        fim = self.movimento.t_final

        conjunto = sp.solveset(
            expressao,
            TEMPO,
            domain=sp.Interval(inicio, fim),
        )

        if conjunto == sp.EmptySet:
            raizes = []

        elif isinstance(conjunto, sp.FiniteSet):
            raizes = []

            for raiz in conjunto:
                if raiz.is_real is False:
                    continue

                try:
                    valor = float(sp.N(raiz, 15))
                except (TypeError, ValueError, OverflowError):
                    continue

                if math.isfinite(valor):
                    raizes.append(valor)

        else:
            raise NotImplementedError(
                "Não foi possível enumerar todas as raízes "
                "reais isoladas no intervalo informado."
            )

        # Verificação numérica das fronteiras.
        escala = self._escala_expressao(expressao)
        tolerancia_relativa = 1e-12
        tolerancia = tolerancia_relativa * escala

        for limite in (inicio, fim):
            valor = self._avaliar_real(expressao, limite)

            if valor is None:
                continue

            # Exige resíduo pequeno em relação à escala da expressão.
            if abs(valor) <= tolerancia:
                raizes.append(limite)

        # Ordenação, restrição ao domínio e remoção de duplicatas.
        raizes_validas = []
        tolerancia_tempo = 1e-9

        for raiz in sorted(raizes):
            if (
                inicio - tolerancia_tempo
                <= raiz
                <= fim + tolerancia_tempo
            ):
                raiz = min(max(raiz, inicio), fim)

                if (
                    not raizes_validas
                    or abs(raiz - raizes_validas[-1])
                    > tolerancia_tempo
                ):
                    raizes_validas.append(raiz)

        return raizes_validas

    def _sinal(self, expressao, instante):
        """
        Retorna:
        - 1: expressão positiva.
        - -1: expressão negativa.
        - 0: expressão nula.

        Lança ValueError se não houver resultado real e finito.
        """
        valor = self._avaliar_real(expressao, instante)

        if valor is None:
            raise ValueError(
                "Não foi possível determinar o sinal da expressão "
                f"em t={instante:g} s."
            )

        if valor > 0:
            return 1

        if valor < 0:
            return -1

        return 0

    def _classificar_raiz(self, expressao, raiz, raizes):
        """
        Classifica uma raiz pela mudança de sinal.

        - positivo -> negativo: máximo local.
        - negativo -> positivo: mínimo local.
        - mesmo sinal: zero sem extremo.
        - fronteiras: limite_inicial ou limite_final.
        """
        inicio = self.movimento.t_inicial
        fim = self.movimento.t_final
        tolerancia = 1e-9

        if abs(raiz - inicio) <= tolerancia:
            return "limite_inicial"

        if abs(raiz - fim) <= tolerancia:
            return "limite_final"

        anteriores = [
            valor for valor in raizes
            if valor < raiz - tolerancia
        ]

        posteriores = [
            valor for valor in raizes
            if valor > raiz + tolerancia
        ]

        limite_esquerdo = (
            max(anteriores) if anteriores else inicio
        )

        limite_direito = (
            min(posteriores) if posteriores else fim
        )

        instante_esquerda = (limite_esquerdo + raiz) / 2
        instante_direita = (raiz + limite_direito) / 2

        esquerda = self._sinal(
            expressao,
            instante_esquerda,
        )

        direita = self._sinal(
            expressao,
            instante_direita,
        )

        if esquerda > 0 and direita < 0:
            return "maximo"

        if esquerda < 0 and direita > 0:
            return "minimo"

        return "zero_sem_extremo"

    def eventos_por_eixo(self):
        """
        Identifica zeros das componentes da velocidade.

        Retorna um dicionário indexado pelos eixos.

        Cada evento contém:
        - instante
        - tipo
        - posicao

        None em um eixo indica componente de velocidade
        identicamente nula no intervalo.
        """
        eventos = {}

        for eixo, velocidade in self.movimento.velocidade.items():
            raizes = self._raizes_no_intervalo(velocidade)

            if raizes is None:
                eventos[eixo] = None
                continue

            eventos[eixo] = []

            for raiz in raizes:
                tipo = self._classificar_raiz(
                    velocidade,
                    raiz,
                    raizes,
                )

                posicao = self.movimento._avaliar_vetor(
                    self.movimento.posicao,
                    raiz,
                )

                eventos[eixo].append(
                    {
                        "instante": raiz,
                        "tipo": tipo,
                        "posicao": posicao,
                    }
                )

        return eventos

    def eventos_repouso(self):
        """
        Retorna eventos de repouso vetorial.

        Cada evento contém:
        - instante
        - tipo
        - posicao
        - rapidez

        Retorno:
        - None: repouso durante todo o intervalo.
        - []: nenhum instante de repouso.
        - Lista de dicionários: instantes isolados de repouso.
        """
        instantes = self.movimento.instantes_repouso()

        if instantes is None:
            return None

        eventos = []

        for instante in instantes:
            posicao = self.movimento._avaliar_vetor(
                self.movimento.posicao,
                instante,
            )

            eventos.append(
                {
                    "instante": instante,
                    "tipo": "repouso",
                    "posicao": posicao,
                    "rapidez": 0.0,
                }
            )

        return eventos

    def extremos_rapidez(self):
        """
        Identifica máximos e mínimos locais da rapidez.

        Analisa as raízes da derivada do quadrado da rapidez.

        Retorna None quando a derivada é identicamente nula,
        indicando rapidez constante.
        """
        rapidez_quadrada = sp.simplify(
            sum(
                componente**2
                for componente in self.movimento.velocidade.values()
            )
        )

        derivada = sp.simplify(
            sp.diff(rapidez_quadrada, TEMPO)
        )

        raizes = self._raizes_no_intervalo(derivada)

        if raizes is None:
            return None

        eventos = []

        for raiz in raizes:
            tipo = self._classificar_raiz(
                derivada,
                raiz,
                raizes,
            )

            if tipo == "zero_sem_extremo":
                continue

            valor_quadrado = sp.N(
                rapidez_quadrada.subs(
                    TEMPO,
                    sp.Float(raiz),
                ),
                15,
            )

            valor_quadrado = float(valor_quadrado)

            if valor_quadrado < -1e-12:
                raise ValueError(
                    "O quadrado da rapidez apresentou "
                    "resultado numericamente negativo."
                )

            rapidez = math.sqrt(max(0.0, valor_quadrado))

            eventos.append(
                {
                    "instante": raiz,
                    "tipo": tipo,
                    "rapidez": rapidez,
                }
            )

        return eventos
