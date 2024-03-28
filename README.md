# Satoshi's Place

<img src="https://i.imgur.com/XUo6fAX.jpg" width="696"/>

This is the official repository containing the source code for [satoshis.place](satoshis.place).

Satoshi's place is a Lightning Network Application (LApp) launched in May 2018 with the purpose of showcasing the viability of running a service that accepts instant, permissionless, near-free microtransactions through Bitcoin's Lightning Network.

It consists of a collaborative art board where each pixel costs 1 satoshi to paint. Pixels can be drawn over an unlimited amount of times.

## What is this for?

It's up to you. You can learn from it, hack it, extend it, run your own version of it, etc... The software is released with an MIT license and meant as a gift to the lightning community in the run-up to the first ever [Lightning Conference](https://www.thelightningconference.com/) in 2019.

## Preparation

You'll need an instance of _c-lightning_ with _lightning-charge_ setup somewhere you can access. Follow the c-lightning instructions [here](https://github.com/ElementsProject/lightning) and the lightning charge instructions [here](https://github.com/ElementsProject/lightning-charge).

In order to setup the database for satoshis-place, you'll need _mongo-tools_ installed in your system, if you're on linux (debian) use `sudo apt install mongo-tools`, if Mac or otherwise follow [these](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/) instructions.

You also need docker installed in your system. Follow [these](https://docs.docker.com/install/) instructions.

## Setup

1. Clone the repository and run `cd satoshis.place`.
2. Enter connection details in `.env` (see `.env.sample` for a template).
3. Run `docker-compose up -d`.
4. Initialize the database by running `docker-compose exec db sh` then `mongorestore /db-init`.
5. Open the application in `http://localhost:3000`.

You might need to wait a couple of seconds for the application to build before the webpage shows.
Check the logs by running `docker-compose logs -f`.
If you see a cheeky monkey `Listening on *:3001 🙉` and a bunch of `PING ...` and `PONG ...` it should be good to go!

You can use the `SIMULATE_PAYMENTS` env setting to automatically execute orders by setting it to `yes` (requires restart of the api). This will allow you to draw on the canvas without having to make a lightning payment.

## Testnet

To use testnet, simply setup your _c-lightning_ node to use testnet, update the connection details if required and set the `TESTNET` env setting to `yes`.

## API

The API for this application is also exposed and can be interacted with directly, the documentation for this can be found [here](API.md).

## Questions?

Any questions or suggestions feel free to open an issue in this repository or reach out to me via twitter at [@LightningK0ala](https://twitter.com/LightningK0ala).
