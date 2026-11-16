
import math
import unittest

from computa.cinematica.movimento import MovimentoVetorial
from computa.cinematica.eventos import EventosMovimento


class TestEventosMovimento(unittest.TestCase):

    def setUp(self):
        self.projetil = MovimentoVetorial(
            x="10*t",
            y="20*t - 4.9*t**2",
            t_inicial=0,
            t_final=5,
        )

        self.eventos = EventosMovimento(self.projetil)

    def test_inversao_no_eixo_y(self):
        resultado = self.eventos.eventos_por_eixo()

        self.assertEqual(len(resultado["x"]), 0)
        self.assertEqual(len(resultado["y"]), 1)

        evento = resultado["y"][0]

        self.assertAlmostEqual(
            evento["instante"],
            20 / 9.8,
            places=8,
        )

        self.assertEqual(evento["tipo"], "maximo")

    def test_posicao_na_altura_maxima(self):
        evento = self.eventos.eventos_por_eixo()["y"][0]

        altura = evento["posicao"][1]

        self.assertAlmostEqual(
            altura,
            20**2 / (2 * 9.8),
            places=8,
        )

    def test_nao_confunde_zero_em_um_eixo_com_repouso(self):
        resultado = self.eventos.eventos_repouso()

        self.assertEqual(resultado, [])

    def test_movimento_com_repouso_vetorial(self):
        movimento = MovimentoVetorial(
            x="t**2",
            y="t**2",
            t_inicial=-2,
            t_final=2,
        )

        eventos = EventosMovimento(movimento)

        resultado = eventos.eventos_repouso()

        self.assertEqual(len(resultado), 1)
        self.assertAlmostEqual(
            resultado[0]["instante"],
            0,
            places=8,
        )

    def test_rapidez_minima_no_projetil(self):
        resultado = self.eventos.extremos_rapidez()

        minimos = [
            evento
            for evento in resultado
            if evento["tipo"] == "minimo"
        ]

        self.assertEqual(len(minimos), 1)

        self.assertAlmostEqual(
            minimos[0]["instante"],
            20 / 9.8,
            places=8,
        )

        self.assertAlmostEqual(
            minimos[0]["rapidez"],
            10,
            places=8,
        )

    def test_rapidez_constante(self):
        movimento = MovimentoVetorial(
            x="3*t",
            y="4*t",
            t_inicial=0,
            t_final=10,
        )

        resultado = EventosMovimento(
            movimento
        ).extremos_rapidez()

        self.assertIsNone(resultado)

    
    def test_movimento_circular_sem_repouso(self):
        movimento = MovimentoVetorial(
            x="cos(t)",
            y="sin(t)",
            t_inicial=0,
            t_final=2 * math.pi,
        )

        eventos = EventosMovimento(movimento)

        self.assertEqual(eventos.eventos_repouso(), [])
        self.assertIsNone(eventos.extremos_rapidez())

    def test_eventos_nos_eixos_do_movimento_circular(self):
        movimento = MovimentoVetorial(
            x="cos(t)",
            y="sin(t)",
            t_inicial=0,
            t_final=2 * math.pi,
        )

        resultado = EventosMovimento(
            movimento
        ).eventos_por_eixo()

        self.assertEqual(len(resultado["x"]), 3)
        self.assertEqual(len(resultado["y"]), 2)

    def test_movimento_helicoidal_sem_repouso(self):
        movimento = MovimentoVetorial(
            x="2*cos(t)",
            y="2*sin(t)",
            z="3*t",
            t_inicial=0,
            t_final=2 * math.pi,
        )

        eventos = EventosMovimento(movimento)

        self.assertEqual(eventos.eventos_repouso(), [])
        self.assertIsNone(eventos.extremos_rapidez())

        estado = movimento.avaliar(1.0)

        self.assertAlmostEqual(
            estado["rapidez"],
            math.sqrt(13),
            places=8,
        )



if __name__ == "__main__":
    unittest.main()
