import { ethers, network } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin = process.env.ADMIN_ADDRESS ?? deployer.address;

  console.log(`Deploying OrigynlLedgerV2 to ${network.name} (chainId=${network.config.chainId})`);
  console.log(`  deployer: ${deployer.address}`);
  console.log(`  admin:    ${admin}`);

  const factory = await ethers.getContractFactory('OrigynlLedgerV2');
  const contract = await factory.deploy(admin);
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log(`\nOrigynlLedgerV2 deployed at: ${addr}`);
  console.log('Set CONTRACT_V2_ADDRESS in Vercel to this address and redeploy the frontend.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
