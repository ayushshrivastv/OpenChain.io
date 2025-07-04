"use client";

import React from 'react';

const newsArticles = [
  {
    title: "LayerZero V2 Live on Mainnet",
    source: "LayerZero Labs",
    excerpt: "LayerZero V2 is now live, introducing a modular security stack, decentralized verifier network, and unified semantics to enhance cross-chain interoperability.",
    href: "https://docs.layerzero.network/v2",
    category: "LayerZero"
  },
  {
    title: "Understanding the LayerZero Protocol",
    source: "LayerZero Scan",
    excerpt: "A deep dive into the architecture of LayerZero, explaining how its endpoint-based system enables direct, secure messaging between blockchains without intermediate chains.",
    href: "https://layerzeroscan.com/",
    category: "Technology"
  },
  {
    title: "The Future is Omnichain: Building Applications with LayerZero",
    source: "LayerZero Blog",
    excerpt: "Explore the possibilities of building omnichain applications that exist and compose across multiple blockchains, creating a seamless user experience.",
    href: "https://medium.com/layerzero-official",
    category: "Development"
  },
  {
    title: "LayerZero Passes 100 Million Messages, Securing Billions in Value",
    source: "Crypto Briefing",
    excerpt: "The LayerZero protocol has now facilitated over 100 million cross-chain messages, demonstrating its robustness and growing adoption in the Web3 ecosystem.",
    href: "#",
    category: "Milestone"
  },
  {
    title: "How LayerZero's V2 Security Stack Protects Against Cross-Chain Hacks",
    source: "Web3 Security Today",
    excerpt: "An analysis of the new security features in LayerZero V2, including the role of Verifiers and Executors in preventing common cross-chain attack vectors.",
    href: "#",
    category: "Security"
  },
  {
    title: "A Guide to the LayerZero Omnichain Block Explorer",
    source: "LayerZero Scan",
    excerpt: "Learn how to use LayerZero Scan to track and verify cross-chain transactions, providing transparency and insight into omnichain activity.",
    href: "https://layerzeroscan.com/",
    category: "Tools"
  }
];

function NewsPage() {
    return (
        <div className="min-h-screen p-12 text-white">
            <h1 className="text-5xl font-extrabold text-white leading-tight mb-12">
                Latest News & Insights
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {newsArticles.map((article) => (
                    <div key={article.title} className="bg-[#F9DDC7] p-6 rounded-2xl text-[#031138] flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
                        <div>
                            <p className="text-sm font-bold text-[#031138]/70 mb-2">{article.source.toUpperCase()}</p>
                            <h2 className="text-xl font-bold mb-3">{article.title}</h2>
                            <p className="text-[#031138]/80 mb-4">{article.excerpt}</p>
                        </div>
                        <a 
                            href={article.href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-white text-[#031138] font-bold py-2 px-4 rounded-lg self-start mt-4 hover:bg-gray-200 transition-colors"
                        >
                            READ MORE
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default NewsPage; 
