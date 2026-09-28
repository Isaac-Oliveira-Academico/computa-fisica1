def normalizar_numero(texto):
    """
    Permite digitar:
    3.14

    ou:
    3,14
    """

    return texto.strip().replace(",", ".")


def ler_float(mensagem):
    """
    Obriga o usuário a digitar um número.
    """

    while True:

        texto = input(mensagem)

        try:

            valor = float(
                normalizar_numero(texto)
            )

            return valor

        except ValueError:

            print(
                "Valor inválido. "
                "Digite um número."
            )


def ler_float_opcional(mensagem):
    """
    Se o usuário apertar ENTER
    sem digitar nada,
    retornamos None.

    None significa:
    informação desconhecida.
    """

    while True:

        texto = input(
            mensagem
        ).strip()

        if texto == "":
            return None

        try:

            valor = float(
                normalizar_numero(texto)
            )

            return valor

        except ValueError:

            print(
                "Digite um número "
                "ou pressione ENTER."
            )


def escolher_opcao(
    titulo,
    opcoes
):
    """
    Exemplo:

    opcoes = {
        "1": "Cinemática",
        "2": "Vetores"
    }
    """

    while True:

        print(
            titulo
        )

        for chave, descricao in opcoes.items():

            print(
                f"{chave} - {descricao}"
            )

        escolha = input(
            "\n> "
        ).strip()

        if escolha in opcoes:
            return escolha

        print(
            "Opção inválida."
        )

def ler_sim_nao(
    mensagem,
    padrao=True
):
    """
    Faz uma pergunta de sim/não.

    padrao=True:
        ENTER sozinho significa SIM.

    padrao=False:
        ENTER sozinho significa NÃO.
    """

    if padrao:
        sufixo = " [S/n]: "
    else:
        sufixo = " [s/N]: "

    while True:

        resposta = input(
            mensagem + sufixo
        ).strip().lower()

        if resposta == "":
            return padrao

        if resposta in (
            "s",
            "sim"
        ):
            return True

        if resposta in (
            "n",
            "nao",
            "não"
        ):
            return False

        print(
            "Responda s ou n."
        )

def pausar():

    input(
        "\nPressione ENTER para continuar..."
    )