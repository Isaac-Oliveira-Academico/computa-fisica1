
import math
import unittest

import sympy as sp

from computa.core.expressao import (
    ErroExpressao,
    interpretar_expressao,
)
from computa.cinematica.movimento import MovimentoVetorial


class TestInterpretador(unittest.TestCase):

    def test_formula_com_potencia(self):
        resultado = interpretar_expressao("3*t^2 + 2*t")
        esperado = 3 * sp.Symbol("t", real=True)**2 + 2 * sp.Symbol("t", real=True)

        self.assertEqual(sp.simplify(resultado - esperado), 0)

    def test_funcao_trigonometrica(self):
        resultado = interpretar_expressao("2*cos(3*t)")
        self.assertEqual(str(resultado), "2*cos(3*t)")

    def test_rejeita_codigo_nao_matematico(self):
        with self.assertRaises(ErroExpressao):
            interpretar_expressao("__import__('os')")


class TestMovimentoParabolico(unittest.TestCase):

    def setUp(self):
        self.movimento = MovimentoVetorial(
            x="10*t",
            y="20*t - 4.9*t^2",
            t_inicial=0,
            t_final=5,
            nome="Lançamento oblíquo",
        )

    def test_dimensao(self):
        self.assertEqual(self.movimento.dimensao, 2)

    def test_posicao_em_um_segundo(self):
        estado = self.movimento.avaliar(1)

        self.assertAlmostEqual(estado["posicao"][0], 10)
        self.assertAlmostEqual(estado["posicao"][1], 15.1)

    def test_velocidade_em_um_segundo(self):
        estado = self.movimento.avaliar(1)

        self.assertAlmostEqual(estado["velocidade"][0], 10)
        self.assertAlmostEqual(estado["velocidade"][1], 10.2)

    def test_aceleracao(self):
        estado = self.movimento.avaliar(1)

        self.assertAlmostEqual(estado["aceleracao"][0], 0)
        self.assertAlmostEqual(estado["aceleracao"][1], -9.8)

    def test_altura_maxima(self):
        instante = 20 / 9.8
        estado = self.movimento.avaliar(instante)

        self.assertAlmostEqual(estado["velocidade"][1], 0, places=8)
        self.assertAlmostEqual(
            estado["posicao"][1],
            20**2 / (2 * 9.8),
            places=8,
        )

    def test_deslocamento(self):
        deslocamento = self.movimento.deslocamento(0, 5)

        self.assertAlmostEqual(deslocamento[0], 50)
        self.assertAlmostEqual(deslocamento[1], -22.5)

    def test_distancia_maior_que_modulo_do_deslocamento(self):
        distancia = self.movimento.distancia_percorrida(0, 5)
        deslocamento = self.movimento.deslocamento(0, 5)
        modulo_deslocamento = math.sqrt(
            sum(componente**2 for componente in deslocamento)
        )

        self.assertGreater(distancia, modulo_deslocamento)


class TestMovimentoHelicoidal(unittest.TestCase):

    def setUp(self):
        self.movimento = MovimentoVetorial(
            x="2*cos(3*t)",
            y="2*sin(3*t)",
            z="4*t",
            t_inicial=0,
            t_final=5,
            nome="Trajetória helicoidal",
        )

    def test_dimensao_3d(self):
        self.assertEqual(self.movimento.dimensao, 3)

    def test_rapidez_constante(self):
        estado = self.movimento.avaliar(1)

        self.assertAlmostEqual(
            estado["rapidez"],
            math.sqrt(52),
            places=8,
        )

    def test_aceleracao_centripeta(self):
        estado = self.movimento.avaliar(0)

        self.assertAlmostEqual(estado["aceleracao"][0], -18)
        self.assertAlmostEqual(estado["aceleracao"][1], 0)
        self.assertAlmostEqual(estado["aceleracao"][2], 0)

    def test_componente_z(self):
        estado = self.movimento.avaliar(2)

        self.assertAlmostEqual(estado["posicao"][2], 8)


class TestRepouso(unittest.TestCase):

    def test_instante_de_repouso(self):
        movimento = MovimentoVetorial(
            x="t^2",
            y="0",
            t_inicial=-2,
            t_final=2,
        )

        instantes = movimento.instantes_repouso()

        self.assertEqual(len(instantes), 1)
        self.assertAlmostEqual(instantes[0], 0)


    def test_repouso_durante_todo_intervalo(self):
        movimento = MovimentoVetorial(
            "0",
            "0",
            t_inicial=0,
            t_final=10,
        )

        self.assertIsNone(movimento.instantes_repouso())

    def test_singularidade_identificada(self):
        movimento = MovimentoVetorial(
            "1/t",
            "0",
            t_inicial=0,
            t_final=10,
        )

        with self.assertRaisesRegex(ValueError, "Singularidade"):
            movimento.avaliar(0)

    def test_resultado_complexo_identificado(self):
        movimento = MovimentoVetorial(
            "sqrt(-1)",
            "0",
            t_inicial=0,
            t_final=10,
        )

        with self.assertRaisesRegex(ValueError, "complexo"):
            movimento.avaliar(1)



if __name__ == "__main__":
    unittest.main(verbosity=2)
