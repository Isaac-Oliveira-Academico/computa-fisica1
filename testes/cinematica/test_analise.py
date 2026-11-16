
import math
import unittest

from computa.cinematica.movimento import MovimentoVetorial
from computa.cinematica.analise import AnaliseMovimento


class TestAnaliseMovimento(unittest.TestCase):

    def setUp(self):
        self.movimento = MovimentoVetorial(
            x="10*t",
            y="20*t - 4.9*t^2",
            t_inicial=0,
            t_final=5,
        )

        self.analise = AnaliseMovimento(self.movimento)

    def test_velocidade_media(self):
        resultado = self.analise.velocidade_media(0, 5)

        self.assertAlmostEqual(resultado[0], 10)
        self.assertAlmostEqual(resultado[1], -4.5)

    def test_aceleracao_media(self):
        resultado = self.analise.aceleracao_media(0, 5)

        self.assertAlmostEqual(resultado[0], 0)
        self.assertAlmostEqual(resultado[1], -9.8)

    def test_resumo_intervalo(self):
        resultado = self.analise.resumo_intervalo(0, 5)

        self.assertAlmostEqual(resultado["duracao"], 5)
        self.assertAlmostEqual(
            resultado["modulo_deslocamento"],
            math.sqrt(50**2 + (-22.5)**2),
        )
        self.assertGreater(
            resultado["distancia_percorrida"],
            resultado["modulo_deslocamento"],
        )

    def test_intervalo_invalido(self):
        with self.assertRaises(ValueError):
            self.analise.velocidade_media(2, 2)

    def test_intervalo_invertido(self):
        with self.assertRaises(ValueError):
            self.analise.resumo_intervalo(4, 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
