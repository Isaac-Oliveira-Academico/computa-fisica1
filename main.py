from core.entrada import (
    escolher_opcao
)

from modulos.cinematica import (
    resolver_muv
)


def main():

    while True:

        print(
            "\n"
            + "=" * 72
        )

        print(
            "COMPUTA — SOLVER DE FÍSICA 1"
        )

        print(
            "=" * 72
        )

        opcao = escolher_opcao(

            "\nEscolha:",

            {
                "1":
                    "Cinemática 1D — MUV",

                "0":
                    "Sair",
            }
        )

        if opcao == "0":

            print(
                "\nEncerrando."
            )

            break

        elif opcao == "1":

            resolver_muv()


if __name__ == "__main__":

    main()