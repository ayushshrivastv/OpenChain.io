"use client";

import React from 'react';

// A simple icon component for visual flair
const TechIcon = ({ d }: { d: string }) => (
  <svg className="w-8 h-8 mr-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const sections = [
    { id: 'layerzero', title: 'LayerZero', icon: "M12 2l-8 8h16L12 2zM4 14h16v6H4v-6z" },
    { id: 'solana', title: 'Solana Integration', icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" },
    { id: 'price-feeds', title: 'Chainlink Price Feeds', icon: "M3 6l3 6h12l3-6H3zM3 18h18" },
    { id: 'automation', title: 'Chainlink Automation', icon: "M12 1v3m0 16v3m8.4-14.4l-2.1 2.1m-12.6 0L3.6 7.6M23 12h-3M4 12H1m16.4 8.4l-2.1-2.1M7.6 3.6L5.7 5.7" },
    { id: 'vrf', title: 'Chainlink VRF', icon: "M16 3.13a4 4 0 0 1 0 7.75L12 15l-4-4.12a4 4 0 0 1 0-7.75" },
];

const DocsPage = () => {
  return (
    <div className="min-h-screen bg-[#031138] text-white p-8 lg:p-12 font-sans">

      <header className="mb-12">
        <h1 className="text-5xl font-extrabold text-white leading-tight">
          Documentation
        </h1>
      </header>
      
      <div className="flex flex-col lg:flex-row">
        
        {/* Left-side Sticky Navigation */}
        <aside className="w-full lg:w-64 lg:sticky lg:top-12 self-start lg:pr-8 mb-12 lg:mb-0">
          <nav>
            <h3 className="text-lg font-bold text-metamask-orange mb-4">On this page</h3>
            <ul className="space-y-3">
              {sections.map(section => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center">
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                    <span className="text-lg font-semibold">{section.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Right-side Content */}
        <main className="flex-1">
          <p className="text-2xl lg:text-3xl text-white mb-16 max-w-3xl">
            A deep dive into the decentralized technologies from LayerZero and Chainlink that power and secure the OpenChain protocol.
          </p>

          <div className="space-y-12">
            {/* Technology Insight Card: LayerZero */}
            <article id="layerzero" className="scroll-mt-24 bg-[#F9DDC7] text-[#031138] p-8 rounded-2xl shadow-lg transition-shadow hover:shadow-xl">
              <header className="flex items-center mb-6">
                <TechIcon d={sections[0].icon} />
                <h2 className="text-4xl font-extrabold">{sections[0].title}</h2>
              </header>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg mb-2">Why I've Used It</h3>
                  <p className="leading-relaxed">To enable the protocol's core functionality: true cross-chain lending and borrowing, allowing assets to be used seamlessly across different blockchains without wrapping or bridging.</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">How It Works in My Protocol</h3>
                  <p className="leading-relaxed">
                    My <code className="text-xs bg-black/10 px-1 py-0.5 rounded">LayerZeroLending.sol</code> contract leverages the LayerZero V2 messaging protocol to communicate between chains. When a user deposits collateral on a source chain, the contract sends a message via the LayerZero endpoint. On the destination chain, this message is received and verified, which then permits the borrowing of assets against the remote collateral. This architecture enables secure and efficient cross-chain value transfer without traditional asset bridging.
                  </p>
                </div>
              </div>
            </article>

            {/* Technology Insight Card: Solana Integration */}
            <article id="solana" className="scroll-mt-24 bg-[#F9DDC7] text-[#031138] p-8 rounded-2xl shadow-lg transition-shadow hover:shadow-xl">
              <header className="flex items-center mb-6">
                <TechIcon d={sections[1].icon} />
                <h2 className="text-4xl font-extrabold">{sections[1].title}</h2>
              </header>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg mb-2">Why I've Used It</h3>
                  <p className="leading-relaxed">To extend the protocol's reach to the high-performance Solana blockchain, enabling fast and cost-effective lending operations while maintaining cross-chain compatibility through LayerZero V2.</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">How It Works in My Protocol</h3>
                  <p className="leading-relaxed">
                    My Solana program implements the LayerZero V2 OApp standard using the Anchor framework. The <code className="text-xs bg-black/10 px-1 py-0.5 rounded">lending_pool</code> program deployed at <code className="text-xs bg-black/10 px-1 py-0.5 rounded">AiTX9Gr1KjTcExetmdpP7PeoYWnY3MpSNbPBpDu9UPrB</code> handles cross-chain messaging through real LayerZero endpoint CPIs. This enables seamless asset lending and borrowing between Solana and EVM chains, leveraging Solana's speed and low costs while maintaining interoperability.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Technical Implementation</h3>
                  <p className="leading-relaxed">
                    The Solana implementation features comprehensive instructions including <code className="text-xs bg-black/10 px-1 py-0.5 rounded">lz_receive</code> for message reception with replay protection, <code className="text-xs bg-black/10 px-1 py-0.5 rounded">send</code> for cross-chain messaging, and proper PDA-based account management. Fee calculation and native SOL transfers are handled through direct LayerZero endpoint CPIs, ensuring secure and efficient cross-chain operations.
                  </p>
                </div>
              </div>
            </article>

            {/* Technology Insight Card: Price Feeds */}
            <article id="price-feeds" className="scroll-mt-24 bg-[#F9DDC7] text-[#031138] p-8 rounded-2xl shadow-lg transition-shadow hover:shadow-xl">
              <header className="flex items-center mb-6">
                <TechIcon d={sections[2].icon} />
                <h2 className="text-4xl font-extrabold">{sections[2].title}</h2>
              </header>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg mb-2">Why I've Used It</h3>
                  <p className="leading-relaxed">To ensure all protocol calculations are based on accurate, real-world asset prices, protecting against data manipulation and securing user funds.</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">How It Works in My Protocol</h3>
                  <p className="leading-relaxed">
                    My <code className="text-xs bg-black/10 px-1 py-0.5 rounded">ChainlinkPriceFeed.sol</code> contract sources reliable, tamper-proof prices for all supported assets. The main <code className="text-xs bg-black/10 px-1 py-0.5 rounded">LayerZeroLending.sol</code> contract constantly references these feeds to accurately value collateral, calculate borrowing power, and determine liquidation thresholds, forming the foundation of the protocol's financial security.
                  </p>
                </div>
              </div>
            </article>

            {/* Technology Insight Card: Automation */}
            <article id="automation" className="scroll-mt-24 bg-[#F9DDC7] text-[#031138] p-8 rounded-2xl shadow-lg transition-shadow hover:shadow-xl">
              <header className="flex items-center mb-6">
                <TechIcon d={sections[3].icon} />
                <h2 className="text-4xl font-extrabold">{sections[3].title}</h2>
              </header>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg mb-2">Why I've Used It</h3>
                  <p className="leading-relaxed">To automate critical, time-sensitive tasks that protect the protocol's health and solvency without any manual or centralized intervention.</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">How It Works in My Protocol</h3>
                  <p className="leading-relaxed">
                    The <code className="text-xs bg-black/10 px-1 py-0.5 rounded">ChainlinkSecurity.sol</code> contract uses Automation to constantly monitor the health of all user loans. If a position becomes undercollateralized, the `checkUpkeep` function returns `true`, signaling the decentralized Chainlink Automation network to call `performUpkeep`. This function then reliably triggers the liquidation process, ensuring the protocol is secured automatically.
                  </p>
                </div>
              </div>
            </article>
            
            {/* Technology Insight Card: VRF */}
            <article id="vrf" className="scroll-mt-24 bg-[#F9DDC7] text-[#031138] p-8 rounded-2xl shadow-lg transition-shadow hover:shadow-xl">
              <header className="flex items-center mb-6">
                <TechIcon d={sections[4].icon} />
                <h2 className="text-4xl font-extrabold">{sections[4].title}</h2>
              </header>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg mb-2">Why I've Used It</h3>
                  <p className="leading-relaxed">To ensure the selection of liquidators is provably fair and unbiased, preventing any single party from monopolizing or gaming the liquidation process.</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">How It Works in My Protocol</h3>
                  <p className="leading-relaxed">
                    When a liquidation is triggered by Automation, the <code className="text-xs bg-black/10 px-1 py-0.5 rounded">ChainlinkSecurity.sol</code> contract uses Verifiable Random Function (VRF) to request a source of provable randomness. This random number is then used to equitably select a liquidator from the authorized pool, guaranteeing a decentralized and fair process for all participants.
                  </p>
                </div>
              </div>
            </article>

          </div>
        </main>
      </div>
    </div>
  );
};

export default DocsPage;
