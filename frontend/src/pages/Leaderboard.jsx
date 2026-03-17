import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { io } from 'socket.io-client';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isReleased, setIsReleased] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initial fetch
    api.get('/leaderboard').then(res => {
      setIsReleased(res.data.released);
      if (res.data.released) {
        setLeaderboard(res.data.data);
      }
    }).catch(console.error);

    // Live socket updates
    const socket = io('http://localhost:5000');
    
    socket.on('leaderboard_released', (status) => {
      setIsReleased(status);
      if (!status) setLeaderboard([]);
    });

    socket.on('leaderboard_update', (lb) => {
      setLeaderboard(lb);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto bg-obsidian">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 pb-4 border-b border-myth-gold">
         <h1 className="text-3xl md:text-4xl font-myth font-bold tracking-widest flex items-center gap-4 text-glow-gold">
          <span className="text-myth-gold text-glow-gold">VULNI</span><span className="text-myth-red text-glow-red">X</span><span className="text-myth-gold text-lg md:text-2xl ml-1">LEADERBOARD</span>
         </h1>
         <button onClick={() => navigate('/dashboard')} className="w-full md:w-auto px-5 py-2 bg-myth-dark text-gray-100 rounded font-body uppercase hover:text-white transition-colors border border-gray-500 hover:border-myth-gold text-sm tracking-widest font-bold shadow-glow-gold">
           Return
         </button>
      </header>

      <div className="bg-myth-dark/60 backdrop-blur border border-myth-gold/20 rounded-lg overflow-hidden shadow-myth-gold p-4 relative">
        <div className="absolute inset-0 bg-ink-wash opacity-50 pointer-events-none mix-blend-overlay"></div>
        {/* Animated header row */}
        <div className="hidden md:grid grid-cols-12 text-myth-gold font-myth text-sm tracking-widest uppercase border-b border-myth-dark py-4 px-6 relative font-black">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-myth-gold to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-myth-gold to-transparent"></div>
          
          <div className="col-span-2 text-center text-glow-gold">Hierarchy</div>
          <div className="col-span-6 text-glow-gold">Deity Name</div>
          <div className="col-span-2 text-center text-glow-gold">Merit</div>
          <div className="col-span-2 text-center text-glow-gold">Vanquished</div>
        </div>

        <div className="space-y-3 mt-6 relative z-10">
          {!isReleased ? (
            <div className="text-center py-20 text-myth-red font-myth tracking-[0.2em] uppercase text-2xl animate-pulse group cursor-default">
              <span className="text-3xl block mb-4">🔒</span>
              The Heavens Have Sealed The Ranks.<br/>
              <span className="text-sm text-myth-red/60 mt-2 block tracking-widest">Await Final Judgement.</span>
            </div>
          ) : leaderboard.map((team, index) => {
             let rowStyle = "bg-myth-darker border-gray-800";
             let rankStyle = "text-gray-500";
             let rankIcon = index + 1;
             
             if (index === 0) {
               rowStyle = "bg-myth-gold/20 border-myth-gold shadow-glow-gold hover:bg-myth-gold/30";
               rankStyle = "text-myth-gold text-glow-gold";
               rankIcon = '🐒 1';
             } else if (index === 1) {
               rowStyle = "bg-gray-300/20 border-gray-400 hover:bg-gray-300/30";
               rankStyle = "text-gray-100 font-bold";
             } else if (index === 2) {
               rowStyle = "bg-orange-600/20 border-orange-500 hover:bg-orange-600/30";
               rankStyle = "text-orange-400 font-bold";
             }

             return (
               <div key={team.id} className={`flex flex-col md:grid md:grid-cols-12 items-center py-4 px-6 rounded border transition-all duration-300 hover:scale-[1.02] animate-slide-up gap-4 md:gap-0 ${rowStyle}`} style={{animationDelay:`${index * 0.1}s`,animationFillMode:'backwards'}}>
                 <div className={`md:col-span-2 text-center font-myth text-2xl md:text-3xl font-bold ${rankStyle}`}>
                   {rankIcon}
                 </div>
                 
                  <div className="md:col-span-6 font-body font-black text-base md:text-lg text-white group flex items-center justify-center md:justify-start tracking-wider">
                   <div className={`w-2 h-2 rounded-full mr-4 animate-pulse ${index === 0 ? 'bg-myth-gold' : 'bg-myth-red'}`}></div>
                   {team.team_name}
                 </div>
                 
                 <div className="flex justify-between w-full md:contents md:w-auto">
                   <div className="md:hidden text-xs text-gray-500 uppercase font-myth self-center">Merit</div>
                   <div className="md:col-span-2 text-center font-myth text-xl md:text-2xl text-myth-gold">
                     {team.total_points}
                   </div>
                 </div>
                 
                 <div className="flex justify-between w-full md:contents md:w-auto">
                   <div className="md:hidden text-xs text-gray-500 uppercase font-myth self-center">Vanquished</div>
                   <div className="md:col-span-2 text-center font-mono text-gray-400">
                     <span className="bg-black/50 px-3 py-1 rounded border border-gray-700 text-xs md:text-sm">
                       {team.challenges_completed} / 3
                     </span>
                   </div>
                 </div>
               </div>
             );
          })}
          
          {isReleased && leaderboard.length === 0 && (
            <div className="text-center py-20 text-gray-500 font-body italic">
              Awaiting the first ascension...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
