'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Flame, Zap, Award, TrendingUp, ChevronDown } from 'lucide-react';

interface HeatmapStats {
  totalRecords: number;
  totalDays: number;
  peakDay: number;
}

export default function GithubHeatmap() {
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<HeatmapStats>({ totalRecords: 0, totalDays: 0, peakDay: 0 });
  const [availableYears, setAvailableYears] = useState<number[]>([2026, 2025]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [loading, setLoading] = useState(true);
  const initialLoadRef = useRef(true);

  // 核心动力：联动切换年份加载对应全量切片
  useEffect(() => {
    setLoading(true);
    fetch(`/api/heatmap?year=${selectedYear}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setHeatmapData(resData.data);
          setStats(resData.stats);
          if (resData.availableYears && resData.availableYears.length > 0) {
            setAvailableYears(resData.availableYears);
            // On first load, auto-select the most recent available year
            if (initialLoadRef.current) {
              initialLoadRef.current = false;
              const maxYear = Math.max(...resData.availableYears);
              if (maxYear !== selectedYear) {
                setSelectedYear(maxYear);
                return; // selectedYear change will trigger a new fetch
              }
            }
          }
        }
      })
      .catch(err => console.error('时空连续性引擎同步故障:', err))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  // 🧱 日期网格发生器：重构为渲染指定年份的标准的 1-12 月标准日历区块
  const generateYearGrid = () => {
    const monthsArray = [];

    for (let month = 0; month < 12; month++) {
      // 获取当前月第一天是周几 (JS 0=Sun, 1=Mon, ..., 6=Sat)
      const firstDay = new Date(selectedYear, month, 1);
      const firstDayOfWeek = firstDay.getDay(); 
      
      // 完美卡槽对齐转换：周一=0, 周二=1 ... 周日=6
      const paddingCellsCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

      // 获取当前月份总天数
      const totalDays = new Date(selectedYear, month + 1, 0).getDate();

      const cells = [];
      // 1. 压入前置占位盲块
      for (let p = 0; p < paddingCellsCount; p++) {
        cells.push(null);
      }
      // 2. 压入全量真实日期
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({
          date: dateStr,
          dayNum: d,
          count: heatmapData[dateStr] || 0
        });
      }

      monthsArray.push({
        label: `${month + 1}月`,
        cells: cells
      });
    }
    return monthsArray;
  };

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-slate-100 hover:bg-slate-200 border border-slate-200/20';
    if (count <= 2) return 'bg-indigo-200 text-indigo-700 shadow-2xs';
    if (count <= 5) return 'bg-indigo-400 text-white shadow-xs';
    if (count <= 8) return 'bg-indigo-600 text-white shadow-sm';
    return 'bg-indigo-900 text-white shadow-md ring-2 ring-indigo-500/10';
  };

  const monthsData = generateYearGrid();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      
      {/* 👑 顶层：大盘头部布局优化（左侧大标题，右侧绝对居上的年份切换下拉选单） */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            📊 考公时空连续性复盘大盘
          </h2>
          <p className="text-[11px] text-slate-400">正在复盘全局多源解法沉淀，切换年份追踪历史演练跨度</p >
        </div>

        {/* ⚡ 年份快速切换舱 */}
        <div className="relative w-full sm:w-auto">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full sm:w-36 appearance-none bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-1.5 pr-9 text-xs rounded-xl font-bold outline-none hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
          >
            {availableYears.map(yr => (
              <option key={yr} value={yr}>📅 {yr} 年度</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 🚀 中层：大盘全局量能动态指标看板 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
        <div className="bg-slate-50/60 border border-slate-100 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Calendar className="w-4 h-4" /></div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold">{selectedYear}年 打卡天数</p >
            <p className="text-base font-black text-slate-800 font-mono">{loading ? '...' : stats.totalDays} <span className="text-[10px] text-slate-400 font-normal">天</span></p >
          </div>
        </div>
        <div className="bg-slate-50/60 border border-slate-100 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Zap className="w-4 h-4" /></div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold">{selectedYear}年 归档总容积</p >
            <p className="text-base font-black text-slate-800 font-mono">{loading ? '...' : stats.totalRecords} <span className="text-[10px] text-slate-400 font-normal">道题</span></p >
          </div>
        </div>
        <div className="bg-slate-50/60 border border-slate-100 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Flame className="w-4 h-4" /></div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold">单日爆发峰值</p >
            <p className="text-base font-black text-slate-800 font-mono">{loading ? '...' : stats.peakDay} <span className="text-[10px] text-slate-400 font-normal">题/日</span></p >
          </div>
        </div>
        <div className="bg-slate-50/60 border border-slate-100 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Award className="w-4 h-4" /></div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold">年度复盘连续率</p >
            <p className="text-base font-black text-slate-800 font-mono">
              {loading ? '...' : stats.totalDays > 0 ? ((stats.totalRecords / stats.totalDays).toFixed(1)) : 0} <span className="text-[10px] text-slate-400 font-normal">题/天</span>
            </p >
          </div>
        </div>
      </div>

      {/* 🚀 底层核心：月度矩阵视图（完美对齐机制） */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400 font-mono tracking-widest animate-pulse">
          ⚡ LOADING CALENDAR DATA...
        </div>
      ) : (
        <div className="w-full overflow-x-auto pb-4 pt-2 scrollbar-thin select-none">
          <div className="flex items-start min-w-max">
            
            {/* ⚓ 星期垂直指标标尺：使用完全等量的 grid行数 与 gap，实现像素级完美咬合卡槽 */}
            <div className="grid grid-rows-7 gap-1.5 pt-7 pr-3 text-[10px] font-bold text-slate-400 tracking-tight text-right shrink-0">
              <span className="h-3.5 flex items-center justify-end">周一</span>
              <span className="h-3.5 flex items-center justify-end text-[9px] text-slate-300 font-normal">周二</span>
              <span className="h-3.5 flex items-center justify-end">周三</span>
              <span className="h-3.5 flex items-center justify-end text-[9px] text-slate-300 font-normal">周四</span>
              <span className="h-3.5 flex items-center justify-end">周五</span>
              <span className="h-3.5 flex items-center justify-end text-[9px] text-slate-300 font-normal">周六</span>
              <span className="h-3.5 flex items-center justify-end text-indigo-500">周日</span>
            </div>

            {/* ⚓ 月度块状方阵流水线：通过 flex gap-6 建立列级完全隔离 */}
            <div className="flex items-start gap-6">
              {monthsData.map((m, mIdx) => (
                <div key={mIdx} className="flex flex-col items-center">
                  
                  {/* 重构点 1：月份标签设置为 w-full 撑满下方网格，并用 text-center 强制居中对齐 */}
                  <div className="w-full text-center text-[10px] font-black text-slate-500 mb-2 tracking-tighter bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md shadow-2xs">
                    {m.label}
                  </div>

                  {/* 重构点 2：方格模块采用与星期标尺绝对相同的 gap-1.5 与 w-3.5 h-3.5 规格 */}
                  <div className="grid grid-rows-7 grid-flow-col gap-1.5">
                    {m.cells.map((cell, idx) => {
                      if (!cell) {
                        return <div key={`pad-${idx}`} className="w-3.5 h-3.5 rounded-xs bg-transparent" />;
                      }

                      return (
                        <div
                          key={cell.date}
                          title={`${cell.date}\n🔥 归档复盘量: ${cell.count} 道题目`}
                          className={`w-3.5 h-3.5 rounded-xs cursor-pointer transition-all hover:scale-125 hover:z-10 ${getColorClass(cell.count)}`}
                        />
                      );
                    })}
                  </div>

                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* 图例解释 */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-[10px] text-slate-400 border-t border-slate-50">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-indigo-500" />
          <span>方格颜色越深，代表当天错题切片和各渠道解法博弈录入越密集</span>
        </div>
        
        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
          <span>空白 (0)</span>
          <div className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-200/20"></div>
          <div className="w-2.5 h-2.5 rounded-xs bg-indigo-200"></div>
          <div className="w-2.5 h-2.5 rounded-xs bg-indigo-400"></div>
          <div className="w-2.5 h-2.5 rounded-xs bg-indigo-600"></div>
          <div className="w-2.5 h-2.5 rounded-xs bg-indigo-900"></div>
          <span className="font-bold text-slate-500">高爆发 (8+)</span>
        </div>
      </div>

    </div>
  );
}