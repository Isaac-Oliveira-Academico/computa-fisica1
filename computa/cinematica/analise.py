
class AnaliseMovimento:
    """Calcula métricas físicas de um movimento vetorial."""

    def __init__(self, movimento):
        self.movimento = movimento

    def velocidade_media(self, t1, t2):
        """Retorna o vetor velocidade média."""

        t1 = self.movimento._validar_instante(t1)
        t2 = self.movimento._validar_instante(t2)

        if t2 <= t1:
            raise ValueError(
                "O segundo instante deve ser maior que o primeiro."
            )

        deslocamento = self.movimento.deslocamento(t1, t2)
        intervalo = t2 - t1

        return tuple(
            componente / intervalo
            for componente in deslocamento
        )

    def aceleracao_media(self, t1, t2):
        """Retorna o vetor aceleração média."""

        t1 = self.movimento._validar_instante(t1)
        t2 = self.movimento._validar_instante(t2)

        if t2 <= t1:
            raise ValueError(
                "O segundo instante deve ser maior que o primeiro."
            )

        estado_inicial = self.movimento.avaliar(t1)
        estado_final = self.movimento.avaliar(t2)

        intervalo = t2 - t1

        return tuple(
            (vf - vi) / intervalo
            for vi, vf in zip(
                estado_inicial["velocidade"],
                estado_final["velocidade"],
            )
        )

    def resumo_intervalo(self, t1, t2, amostras=2001):
        """Produz um resumo quantitativo do movimento."""

        t1 = self.movimento._validar_instante(t1)
        t2 = self.movimento._validar_instante(t2)

        if t2 <= t1:
            raise ValueError(
                "O segundo instante deve ser maior que o primeiro."
            )

        estado_inicial = self.movimento.avaliar(t1)
        estado_final = self.movimento.avaliar(t2)

        deslocamento = self.movimento.deslocamento(t1, t2)
        distancia = self.movimento.distancia_percorrida(
            t1,
            t2,
            amostras=amostras,
        )

        velocidade_media = self.velocidade_media(t1, t2)
        aceleracao_media = self.aceleracao_media(t1, t2)

        rapidez_media = distancia / (t2 - t1)

        return {
            "intervalo": (t1, t2),
            "duracao": t2 - t1,
            "posicao_inicial": estado_inicial["posicao"],
            "posicao_final": estado_final["posicao"],
            "velocidade_inicial": estado_inicial["velocidade"],
            "velocidade_final": estado_final["velocidade"],
            "aceleracao_inicial": estado_inicial["aceleracao"],
            "aceleracao_final": estado_final["aceleracao"],
            "deslocamento": deslocamento,
            "modulo_deslocamento": self.movimento._modulo(
                deslocamento
            ),
            "distancia_percorrida": distancia,
            "velocidade_media": velocidade_media,
            "aceleracao_media": aceleracao_media,
            "rapidez_media": rapidez_media,
        }
