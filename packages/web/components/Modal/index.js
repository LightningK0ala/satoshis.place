import { Component } from "react";
import ReactModal from "react-responsive-modal";
import Button from "../ui/Button";
import QRCode from "../ui/QRCode";
import { observer, inject } from "mobx-react";
import BitcoinSpinner from "../BitcoinSpinner";
import CopyToClipboard from "react-copy-to-clipboard";
import { Flex, Text, Image } from "rebass";
import styled from "styled-components";
import { color, fontSize } from "styled-system";

export const modalContentTypes = {
  PAYMENT: "PAYMENT",
  INFO: "INFO",
};

const Span = styled.span`
  ${color}
`;
const Icon = styled.i`
  ${color}${fontSize}
`;

const UnstyledLink = styled.a`
  color: inherit;
  text-decoration: inherit;
  &:link,
  &:hover {
    color: inherit;
    text-decoration: inherit;
  }
`;

const Logo = styled.img`
  height: 40px;
`;

const Emphasize = ({ children }) => (
  <Span color="primary">
    <b>
      <i>{children}</i>
    </b>
  </Span>
);

const Link = ({ children, ...props }) => (
  <a {...props}>
    <Span color="primary">
      <u>{children}</u>
    </Span>
  </a>
);

@inject("store")
@observer
export default class Modal extends Component {
  state = {
    showNodeQr: false,
  };

  toggleShowNodeQr = () =>
    this.setState({ showNodeQr: !this.state.showNodeQr });

  renderContent = (contentOverride) => {
    const {
      activeModalType,
      closeModal,
      paintedPixelsCount,
      currentPaymentRequest,
      priceInSatoshis,
      priceInDollars,
      getInvoiceExpiry,
    } = this.props.store;

    const isTestnet = process.env.TESTNET === "yes";

    switch (contentOverride || activeModalType) {
      case modalContentTypes.PAYMENT:
        /**
        |--------------------------------------------------
        | Payment modal content
        |--------------------------------------------------
        */
        return (
          <Flex flexDirection="column">
            <h1 style={{ marginTop: 0 }}>Payment</h1>
            <p>
              Your painting will cost:{" "}
              <b>
                {priceInSatoshis} {isTestnet ? "tSatoshis" : "satoshis"}
                {priceInDollars
                  ? ` (≈ ${priceInDollars} ${isTestnet ? "tUSD" : "USD"})`
                  : null}
              </b>
            </p>
            <p>
              To proceed, make a Bitcoin Lightning Network payment with the
              following payment request:
            </p>
            <p>
              This invoice will expire in {getInvoiceExpiry()} minutes since it
              was created.
            </p>
            <div className="qr-wrapper">
              {currentPaymentRequest ? (
                <a href={`lightning:${currentPaymentRequest}`}>
                  <QRCode value={currentPaymentRequest} size={200} />
                </a>
              ) : (
                <BitcoinSpinner />
              )}
            </div>
            <Text textAlign="center" fontSize={[1]}>
              Powered by
            </Text>
            <Flex justify="center" style={{ marginTop: "10px" }}>
              <a
                href="https://voltage.cloud"
                target="_blank"
                rel="noreferrer"
                style={{ display: "contents" }}
              >
                <Image width={[1 / 5]} src="/static/voltage_logo.webp" />
              </a>
            </Flex>
            <Text>
              <b>Payment Request:</b>
            </Text>
            <Text my={2} style={{ wordWrap: "break-word" }}>
              <i>{currentPaymentRequest}</i>
            </Text>
            <CopyToClipboard
              text={currentPaymentRequest}
              onCopy={() =>
                window.alert("Payment Request copied to clipboard.")
              }
            >
              <Button w={200}>Copy Payment Request</Button>
            </CopyToClipboard>
            <Text mt={4}>
              <b>Node information:</b>
            </Text>
            <Text my={2} style={{ wordWrap: "break-word" }}>
              <i>{process.env.LN_NODE_URI}</i>
            </Text>
            <Flex>
              <CopyToClipboard
                text={process.env.LN_NODE_URI}
                onCopy={() =>
                  window.alert("Node Information copied to clipboard.")
                }
              >
                <Button w={200}>Copy Node Information</Button>
              </CopyToClipboard>
              <Button
                ml={2}
                active={this.state.showNodeQr}
                onClick={this.toggleShowNodeQr}
              >
                <Icon className={`fa fa-qrcode`} />
              </Button>
            </Flex>
            {this.state.showNodeQr && (
              <div className="qr-wrapper">
                <QRCode value={process.env.LN_NODE_URI} size={200} />
              </div>
            )}
            <Button mt={4} active onClick={closeModal}>
              Close
            </Button>
            <style jsx>{`
              .qr-wrapper {
                padding: 2em 0;
                margin: 0 auto;
              }
            `}</style>
          </Flex>
        );
      case modalContentTypes.INFO:
        /**
        |--------------------------------------------------
        | Info modal content
        |--------------------------------------------------
        */
        return (
          <Flex flexDirection="column">
            <Flex mb={3} ml={"-5px"} justify="center">
              <Logo src="/static/logo.png" />
            </Flex>
            <Flex mt={"-10px"} justify="center">
              by&nbsp;
              <Link target="_blank" href="https://twitter.com/LightningK0ala">
                Lightning K0ala
              </Link>
            </Flex>
            <Text mt={4} mb={3}>
              Welcome!
            </Text>
            <Text>
              Satoshi's Place is a Lightning Network ⚡ enabled online
              collaborative artboard. Inspired by{" "}
              <Link
                target="_blank"
                href="https://www.youtube.com/watch?v=XnRCZK3KjUY"
              >
                Reddit Place
              </Link>
              , and the{" "}
              <Link
                target="_blank"
                href="http://www.milliondollarhomepage.com/"
              >
                Million Dollar Homepage
              </Link>
              .
            </Text>
            <ul>
              <li>
                There are{" "}
                <Span color="orange">
                  <b>
                    <i>1 million pixels</i>
                  </b>
                </Span>{" "}
                on the canvas.
              </li>
              <li>
                Each pixel costs{" "}
                <Span color="orange">
                  <b>
                    <i>1 satoshi to paint.</i>
                  </b>
                </Span>
              </li>
              <li>Pixels can be painted over indefinitely.</li>
            </ul>
            <Text mt={3}>
              Satoshi's Place is a great way to experience the power of
              micro-transactions through the Bitcoin Lightning Network.
            </Text>
            <Text my={3}>
              If you're a developer interested in building scripts, bots and
              services for satoshis.place, there is documentation for the API
              available{" "}
              <Link
                target="_blank"
                href="https://github.com/LightningK0ala/satoshis.place/blob/master/README.md"
              >
                here
              </Link>
              .
            </Text>
            <Text textAlign="center" fontSize={[1]}>
              Powered by
            </Text>
            <Flex justify="center" style={{ marginTop: "10px" }}>
              <a
                href="https://voltage.cloud"
                target="_blank"
                rel="noreferrer"
                style={{ display: "contents" }}
              >
                <Image width={[1 / 5]} src="/static/voltage_logo.webp" />
              </a>
            </Flex>
            <Button mt={4} success onClick={closeModal}>
              Let's go!
            </Button>
          </Flex>
        );
      default:
        return "";
    }
  };
  render() {
    const {
      isModalOpen,
      closeModal,
      paintedPixelsCount,
      currentPaymentRequest,
      priceInSatoshis,
      priceInDollars,
      getInvoiceExpiry,
    } = this.props.store;

    return (
      <div>
        {!isModalOpen && (
          // NOTE: This render is here for performance reasons. If the modal
          // contents are not rendered before they are needed there will be
          // a slight delay.
          <div style={{ display: "none" }}>
            {this.renderContent(modalContentTypes.INFO)}
            {this.renderContent(modalContentTypes.PAYMENT)}
          </div>
        )}
        <ReactModal
          closeOnEsc
          closeOnOverlayClick
          onClose={closeModal}
          open={isModalOpen}
          styles={{
            modal: {
              maxWidth: "514px",
              padding: "3em",
              overflow: "auto",
            },
          }}
        >
          {this.renderContent()}
        </ReactModal>
      </div>
    );
  }
}
