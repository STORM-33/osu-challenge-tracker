import { useState } from 'react';
import Layout from '../components/Layout';
import { Trophy, Calendar, Gift, Zap, Users, Music, Sparkles, Info, ChevronRight, Star, Dice3, Award, Clock, AlertCircle, CheckCircle2, BarChart3, TrendingUp, Target } from 'lucide-react';

export default function AboutChallengers() {
  const [activeTab, setActiveTab] = useState('weekly');

  return (
    <Layout>
      <div className="min-h-screen py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header Section */}
          <div className="mb-8 sm:mb-10 lg:mb-12">
            <div className="text-center">
              {/* Trophy Animation Container */}
              <div className="relative inline-block mb-6 sm:mb-8">
                <Trophy className="w-16 h-16 sm:w-24 sm:h-24 text-white relative z-10 icon-shadow-adaptive-lg animate-float" />
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-shadow-adaptive-lg mb-4 sm:mb-6">
                osu!Challengers
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-white/80 max-w-3xl mx-auto text-shadow-adaptive leading-relaxed px-4 sm:px-0">
                Welcome to osu!Challengers - a collection of competitive events where you can test your skills, win supporter, and have fun with the community!
              </p>
            </div>
          </div>

          {/* Event Types Grid */}
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="p-2 sm:p-3 icon-gradient-purple rounded-lg sm:rounded-xl icon-container-purple">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white icon-shadow-adaptive" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white text-shadow-adaptive">
                Event Types
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Weekly Card */}
              <div
                className={`glass-1 flex flex-col rounded-xl sm:rounded-2xl p-4 sm:p-6 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                  activeTab === 'weekly' ? 'ring-2 ring-blue-400/60 glass-2' : ''
                }`}
                onClick={() => setActiveTab('weekly')}
              >
                {/* Header: icon and title */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 sm:p-3 icon-gradient-blue rounded-lg sm:rounded-xl icon-container-blue">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white icon-shadow-adaptive" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white text-shadow-adaptive">
                      o!C Weekly
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-white/80 leading-relaxed text-shadow-adaptive-sm">
                    Standard weekly challenges with single maps. Difficulty increases throughout the month.
                  </p>
                </div>

                {/* Prize section aligned to bottom */}
                <div className="mt-auto pt-4">
                  <div className="glass-1 rounded-lg sm:rounded-xl p-2.5 sm:p-3 inline-flex items-center gap-2">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 icon-shadow-adaptive-sm" />
                    <span className="text-sm sm:text-base font-semibold text-white/90 text-shadow-adaptive-sm">
                      2 Supporter Prizes
                    </span>
                  </div>
                </div>
              </div>

              {/* CE Card */}
              <div
                className={`glass-1 flex flex-col rounded-xl sm:rounded-2xl p-4 sm:p-6 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                  activeTab === 'ce' ? 'ring-2 ring-purple-400/60 glass-2' : ''
                }`}
                onClick={() => setActiveTab('ce')}
              >
                {/* Header: icon and title */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 sm:p-3 icon-gradient-purple rounded-lg sm:rounded-xl icon-container-purple">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white icon-shadow-adaptive" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white text-shadow-adaptive">
                      o!C CE
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-white/80 leading-relaxed text-shadow-adaptive-sm">
                    Cycle End events featuring all maps from the current season. Top 3 + raffle system!
                  </p>
                </div>

                {/* Prize section aligned to bottom */}
                <div className="mt-auto pt-4">
                  <div className="glass-1 rounded-lg sm:rounded-xl p-2.5 sm:p-3 inline-flex items-center gap-2">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 icon-shadow-adaptive-sm" />
                    <span className="text-sm sm:text-base font-semibold text-white/90 text-shadow-adaptive-sm">
                      6 Supporter Prizes
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Card */}
              <div
                className={`glass-1 flex flex-col rounded-xl sm:rounded-2xl p-4 sm:p-6 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl relative overflow-hidden ${
                  activeTab === 'custom' ? 'ring-2 ring-green-400/60 glass-2' : ''
                }`}
                onClick={() => setActiveTab('custom')}
              >
                {/* Header: icon and title */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 sm:p-3 icon-gradient-green rounded-lg sm:rounded-xl icon-container-green">
                      <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white icon-shadow-adaptive" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white text-shadow-adaptive">
                      o!C Custom
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-white/80 leading-relaxed text-shadow-adaptive-sm">
                    Special events with custom maps and songs created just for you!
                  </p>
                </div>

                {/* Prize section aligned to bottom */}
                <div className="mt-auto pt-4">
                  <div className="glass-1 rounded-lg sm:rounded-xl p-2.5 sm:p-3 inline-flex items-center gap-2">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 icon-shadow-adaptive-sm" />
                    <span className="text-sm sm:text-base font-semibold text-white/90 text-shadow-adaptive-sm">
                      6 Months + Merch
                    </span>
                  </div>
                </div>

                {/* Badge on top right */}
                <span className="absolute top-3 right-3 px-2.5 py-1 bg-gradient-to-b from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-lg">
                  Coming Soon!
                </span>
              </div>
            </div>
          </div>

          {/* Tab Content Container */}
          <div className="glass-1 rounded-xl sm:rounded-2xl overflow-hidden mb-8 sm:mb-10">
            {/* Tab Navigation */}
            <div className="p-4 sm:p-6 border-b border-white/10">
              <div className="view-mode-slider">
                <div className="slider-track">
                  <div className={`slider-thumb ${
                    activeTab === 'ce' ? 'slider-thumb-right' : 
                    activeTab === 'custom' ? 'slider-thumb-right' : ''
                  }`} style={{
                    left: activeTab === 'weekly' ? '4px' : 
                          activeTab === 'ce' ? '33.33%' :
                          '66.66%',
                    right: activeTab === 'weekly' ? '66.66%' : 
                           activeTab === 'ce' ? '33.33%' :
                           '4px',
                    width: 'calc(33.33% - 8px)'
                  }} />
                  <button
                    onClick={() => setActiveTab('weekly')}
                    className={`slider-option ${activeTab === 'weekly' ? 'slider-option-active' : ''}`}
                  >
                    <span className="hidden sm:inline">Weekly Details</span>
                    <span className="sm:hidden">Weekly</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('ce')}
                    className={`slider-option ${activeTab === 'ce' ? 'slider-option-active' : ''}`}
                  >
                    <span className="hidden sm:inline">CE Details</span>
                    <span className="sm:hidden">CE</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('custom')}
                    className={`slider-option ${activeTab === 'custom' ? 'slider-option-active' : ''}`}
                  >
                    <span className="hidden sm:inline">Custom Details</span>
                    <span className="sm:hidden">Custom</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6 lg:p-8">
              {activeTab === 'weekly' && (
                <div className="space-y-6 sm:space-y-8">
                  <div>
                    <p className="text-base sm:text-lg text-white/90 leading-relaxed text-shadow-adaptive">
                      Every week, a new Playlist is created in Lazer containing exactly <span className="font-bold text-white">1 map</span>. 
                      The difficulty progression throughout the month is carefully designed to challenge players of all skill levels.
                    </p>
                  </div>
                  
                  {/* Difficulty Progression */}
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 text-shadow-adaptive">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 icon-shadow-adaptive" />
                      Difficulty Progression
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      <div className="text-center glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:glass-2 transition-all">
                        <div className="text-xl sm:text-2xl font-black text-white mb-1 text-shadow-adaptive">Week 1</div>
                        <div className="text-sm sm:text-base font-semibold text-white/90 text-shadow-adaptive-sm">5.5★ - 5.9★</div>
                      </div>
                      <div className="text-center glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:glass-2 transition-all">
                        <div className="text-xl sm:text-2xl font-black text-white mb-1 text-shadow-adaptive">Week 2</div>
                        <div className="text-sm sm:text-base font-semibold text-white/90 text-shadow-adaptive-sm">6.0★ - 6.4★</div>
                      </div>
                      <div className="text-center glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:glass-2 transition-all">
                        <div className="text-xl sm:text-2xl font-black text-white mb-1 text-shadow-adaptive">Week 3</div>
                        <div className="text-sm sm:text-base font-semibold text-white/90 text-shadow-adaptive-sm">6.5★ - 6.9★</div>
                      </div>
                      <div className="text-center glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:glass-2 transition-all">
                        <div className="text-xl sm:text-2xl font-black text-white mb-1 text-shadow-adaptive">Week 4</div>
                        <div className="text-sm sm:text-base font-semibold text-white/90 text-shadow-adaptive-sm">7.0★ - 7.4★</div>
                      </div>
                    </div>
                  </div>

                  {/* How to Win */}
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 text-shadow-adaptive">
                      <Trophy className="w-5 h-5 sm:w-6 sm:h-6 icon-shadow-adaptive" />
                      How to Win Supporter
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:glass-2 hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 icon-gradient-green rounded-lg icon-container-green">
                            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white icon-shadow-adaptive-sm" />
                          </div>
                          <h5 className="text-base sm:text-lg font-semibold text-white text-shadow-adaptive">Highest Score</h5>
                        </div>
                        <p className="text-sm sm:text-base text-white/80 leading-relaxed text-shadow-adaptive-sm">
                          Win the Playlist by achieving the highest overall score across all difficulties
                        </p>
                      </div>
                      <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:glass-2 hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 icon-gradient-purple rounded-lg icon-container-purple">
                            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white icon-shadow-adaptive-sm" />
                          </div>
                          <h5 className="text-base sm:text-lg font-semibold text-white text-shadow-adaptive">Mod Challenge</h5>
                        </div>
                        <p className="text-sm sm:text-base text-white/80 leading-relaxed text-shadow-adaptive-sm">
                          Get the best score with the specific mod chosen for that week
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ce' && (
                <div className="space-y-6 sm:space-y-8">
                  <div>
                    <p className="text-base sm:text-lg text-white/90 leading-relaxed text-shadow-adaptive">
                      Three days before the end of each month, a special collage is created containing <span className="font-bold text-white">all Weekly maps</span> 
                      from the current season. This creates massive multi-map challenges that test your consistency across all difficulty levels!
                    </p>
                  </div>
                  
                  {/* Prize Distribution */}
                  <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6">
                    <h4 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2 text-shadow-adaptive">
                      <Award className="w-5 h-5 sm:w-6 sm:h-6 icon-shadow-adaptive" />
                      Prize Distribution
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg">
                          1
                        </div>
                        <span className="text-sm sm:text-base font-semibold text-white text-shadow-adaptive-sm">
                          Top 3 on leaderboard: 1 month Supporter each
                        </span>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg">
                          2
                        </div>
                        <span className="text-sm sm:text-base font-semibold text-white text-shadow-adaptive-sm">
                          Raffle winners (3 people): 1 month Supporter each
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Raffle System */}
                  <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 icon-gradient-purple rounded-lg icon-container-purple">
                        <Dice3 className="w-5 h-5 sm:w-6 sm:h-6 text-white icon-shadow-adaptive" />
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold text-white text-shadow-adaptive">How the Raffle Works</h4>
                    </div>
                    <ul className="space-y-2 sm:space-y-3">
                      <li className="flex items-start gap-2 sm:gap-3">
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-white/70 icon-shadow-adaptive-sm" />
                        <span className="text-sm sm:text-base text-white/90 text-shadow-adaptive-sm">Each top score on a map = 1 raffle entry</span>
                      </li>
                      <li className="flex items-start gap-2 sm:gap-3">
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-white/70 icon-shadow-adaptive-sm" />
                        <span className="text-sm sm:text-base text-white/90 text-shadow-adaptive-sm">Maximum entries = number of maps in the Playlist</span>
                      </li>
                      <li className="flex items-start gap-2 sm:gap-3">
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-white/70 icon-shadow-adaptive-sm" />
                        <span className="text-sm sm:text-base text-white/90 text-shadow-adaptive-sm">3 winners drawn, all entries for a winner removed after selection</span>
                      </li>
                      <li className="flex items-start gap-2 sm:gap-3">
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-white/70 icon-shadow-adaptive-sm" />
                        <span className="text-sm sm:text-base text-white/90 text-shadow-adaptive-sm">More top scores = better odds, but still 1 month prize</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'custom' && (
                <div className="space-y-6 sm:space-y-8">
                  <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:glass-2 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 icon-gradient-green rounded-lg icon-container-green">
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white icon-shadow-adaptive" />
                      </div>
                      <h4 className="text-lg sm:text-xl font-semibold text-white text-shadow-adaptive">Something Special!</h4>
                    </div>
                    <p className="text-sm sm:text-base text-white/80 leading-relaxed text-shadow-adaptive-sm">
                      Custom events feature <span className="font-bold text-white">custom commissioned maps</span> with 
                      <span className="font-bold text-white"> brand new songs</span> created exclusively for osu!Challengers participants! 
                      This is a completely unique experience you won't find anywhere else.
                    </p>
                  </div>

                  {/* Prize Pool */}
                  <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6">
                    <h4 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2 text-shadow-adaptive">
                      Prize Pool
                    </h4>
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl">
                        <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white icon-shadow-adaptive" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-lg sm:text-xl mb-1 text-shadow-adaptive">
                          6 Months of osu!supporter
                        </h5>
                        <p className="text-sm sm:text-base text-white/90 text-shadow-adaptive-sm">
                          Plus your choice of official osu! merchandise!
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 glass-1 rounded-lg p-3 flex items-center gap-2">
                      <Info className="w-4 h-4 text-white/80 icon-shadow-adaptive-sm" />
                      <span className="text-xs sm:text-sm text-white/80 text-shadow-adaptive-sm">
                        Merchandise must be in stock on the official osu! store
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-b from-green-500 to-emerald-500 text-white font-bold rounded-full shadow-lg text-base sm:text-lg">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                      Currently in Production - Stay Tuned!
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rules Section */}
          <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 sm:p-3 icon-gradient-orange rounded-lg sm:rounded-xl icon-container-orange">
                <Info className="w-5 h-5 sm:w-6 sm:h-6 text-white icon-shadow-adaptive" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white text-shadow-adaptive">
                Important Guidelines
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6">
                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-shadow-adaptive">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 icon-shadow-adaptive-sm" />
                  Mod Challenges
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-white/70 mt-1 text-shadow-adaptive-sm">•</span>
                    <span className="text-sm sm:text-base text-white/80 text-shadow-adaptive-sm">
                      Unless specified in the Playlist description, mod challenges must use default settings
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white/70 mt-1 text-shadow-adaptive-sm">•</span>
                    <span className="text-sm sm:text-base text-white/80 text-shadow-adaptive-sm">
                      You can add other mods, even ones that change the main mod's difficulty
                    </span>
                  </li>
                </ul>
              </div>
              
              <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6">
                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-shadow-adaptive">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 icon-shadow-adaptive-sm" />
                  Score Visibility
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-white/70 mt-1 text-shadow-adaptive-sm">•</span>
                    <span className="text-sm sm:text-base text-white/80 text-shadow-adaptive-sm">
                      Your winning score must be publicly visible on the official Playlist leaderboard
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white/70 mt-1 text-shadow-adaptive-sm">•</span>
                    <span className="text-sm sm:text-base text-white/80 text-shadow-adaptive-sm">
                      Screenshots of non-visible plays won't count
                    </span>
                  </li>
                </ul>
              </div>

              <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6 md:col-span-2">
                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-shadow-adaptive">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 icon-shadow-adaptive-sm" />
                  Fair Play & Sportsmanship
                </h4>
                <p className="text-sm sm:text-base text-white/80 text-shadow-adaptive-sm">
                  Respect all participants and their achievements. Everyone is trying their best, and that deserves recognition. 
                  Keep the competition friendly and fun!
                </p>
              </div>
            </div>

            <div className="mt-6 glass-1 rounded-lg p-4 border border-orange-400/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0 icon-shadow-adaptive-sm" />
                <p className="text-sm sm:text-base text-white/80 text-shadow-adaptive-sm">
                  <span className="font-bold text-white">Note:</span> Violation of these guidelines may result in exclusion from future events. 
                  Guidelines may be updated to ensure a positive experience for all participants.
                </p>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="mt-8 sm:mt-10 text-center">
            <div className="inline-flex flex-col items-center gap-4 sm:gap-6 px-6 py-6 sm:px-10 sm:py-8 glass-2 rounded-2xl sm:rounded-3xl shadow-2xl">
              <div className="flex items-center gap-4">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white icon-shadow-adaptive animate-pulse-soft" />
                <h3 className="text-xl sm:text-2xl font-bold text-white text-shadow-adaptive">Ready to Compete?</h3>
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white icon-shadow-adaptive animate-pulse-soft" />
              </div>
              <p className="text-sm sm:text-lg text-white/80 max-w-2xl leading-relaxed text-shadow-adaptive-sm">
                Jump into the current challenge and show what you've got! Every map is an opportunity to prove your skills and win amazing prizes.
              </p>
              <div className="flex items-center gap-3 text-white font-bold">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 icon-shadow-adaptive" />
                <span className="text-base sm:text-lg text-shadow-adaptive">Good luck and have fun!</span>
                <Star className="w-5 h-5 sm:w-6 sm:h-6 icon-shadow-adaptive" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}