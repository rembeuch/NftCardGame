import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import { useNavigate } from 'react-router-dom';
import { ABI, ADDRESS } from '../contract/index.js';
import { createEventListeners } from './createEventListeners';
import { GetParams } from '../utils/onboard.js';



const GlobalContext = createContext();
export const GlobalContextProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [showAlert, setShowAlert] = useState({ status: false, type: 'info', message: '' });
  const [battleName, setBattleName] = useState('');
  const [gameData, setGameData] = useState({ players: [], pendingBattles: [], activeBattle: null });
  const [updateGameData, setUpdateGameData] = useState(0);
  const [battleGround, setBattleGround] = useState('bg-astral');
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');


  const player1Ref = useRef();
  const player2Ref = useRef();

  const navigate = useNavigate();



  const updateCurrentWalletAddress = async () => {
    const accounts = await window?.ethereum?.request({ method: 'eth_requestAccounts' });
    if (accounts) setWalletAddress(accounts[0]);
  };

  useEffect(() => {
    updateCurrentWalletAddress();

    window?.ethereum?.on('accountsChanged', updateCurrentWalletAddress);
  }, []);

  useEffect(() => {
    const setSmartContractAndProvider = async () => {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const newProvider = new ethers.providers.Web3Provider(connection);
      const signer = newProvider.getSigner();
      const newContract = new ethers.Contract(ADDRESS, ABI, signer);

      setProvider(newProvider);
      setContract(newContract);
    };

    setSmartContractAndProvider();
  }, []);

  useEffect(() => {
    if (step === -1 && contract) {
      createEventListeners({ navigate, contract, provider, walletAddress, setShowAlert, setUpdateGameData, player1Ref, player2Ref })
    }
  }, [step, contract])

  useEffect(() => {
    const isBattleground = localStorage.getItem('battleground');

    if (isBattleground) {
      setBattleGround(isBattleground);
    } else {
      localStorage.setItem('battleground', battleGround);
    }
  }, []);

  useEffect(() => {
    const resetParams = async () => {
      const currentStep = await GetParams();

      setStep(currentStep.step);
    };

    resetParams();

    window?.ethereum?.on('chainChanged', () => resetParams());
    window?.ethereum?.on('accountsChanged', () => resetParams());
  }, []);


  //* Handle alerts
  useEffect(() => {
    if (showAlert?.status) {
      const timer = setTimeout(() => {
        setShowAlert({ status: false, type: 'info', message: '' });
      }, [5000]);

      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  //* Set the game data to the state
  useEffect(() => {
    const fetchGameData = async () => {
      if (contract) {
        const fetchedBattles = await contract.getAllBattles();
        const pendingBattles = fetchedBattles.filter((battle) => battle.battleStatus === 0);
        let activeBattle = null;

        fetchedBattles.forEach((battle) => {
          if (battle.players.find((player) => player.toLowerCase() === walletAddress.toLowerCase())) {
            if (battle.winner.startsWith('0x00')) {
              activeBattle = battle;
            }
          }
        });

        setGameData({ pendingBattles: pendingBattles.slice(1), activeBattle });
      }
    };

    fetchGameData();
  }, [contract, updateGameData]);

  useEffect(() => {
    if (errorMessage) {
      const parsedErrorMessage = errorMessage?.message

      // Chercher l'indice du début de la sous-chaîne "reverted with reason string"
      const indiceDebut = parsedErrorMessage.indexOf("reverted with reason string");

      if (indice !== -1) {
        // Extraire le texte après "reverted with reason string"
        let texteApresReverted = parsedErrorMessage.substring(indice + "reverted with reason string '".length);

        // Chercher l'indice de la fin de la raison (jusqu'au prochain ')
        const indiceEnd = texteApresReverted.indexOf("'");

        if (indiceEnd !== -1) {
          // Extraire la raison
          const reason = texteApresReverted.substring(0, indiceEnd);
          console.log(reason);
          if (parsedErrorMessage) {
            setShowAlert({
              status: true,
              type: 'failure',
              message: reason,
            });
          }
        } else {
          console.log("Aucune raison trouvée après 'reverted with reason string'");
        }
      } else {
        console.log("Aucune occurrence de 'reverted with reason string' trouvée dans le message d'erreur.");
      }

    }
  }, [errorMessage]);

  return (
    <GlobalContext.Provider
      value={{
        contract, walletAddress, updateCurrentWalletAddress, showAlert,
        setShowAlert, battleName, setBattleName, gameData, battleGround, setBattleGround, errorMessage, setErrorMessage,
        player1Ref, player2Ref,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

export const useGlobalContext = () => useContext(GlobalContext);