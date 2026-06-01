'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StudyRecord, RecordFilter } from '@/types/record';
import { RecordService } from '@/services/RecordService';
import FilterBar from './FilterBar';
import RecordCard from './RecordCard';
import RecordDetail from './RecordDetail';
import RecordForm from './RecordForm';

export default function RepositoryGrid({ initialFilters }: { initialFilters?: RecordFilter | null } = {}) {
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [dynamicTypes, setDynamicTypes] = useState<string[]>([]);

  // Detail/edit state
  const [activeRecord, setActiveRecord] = useState<StudyRecord | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const desiredTypeRef = useRef<string | null>(null);

  // Fetch question types when subject changes
  useEffect(() => {
    RecordService.getQuestionTypes(selectedSubject || undefined)
      .then(types => {
        setDynamicTypes(types);
        if (desiredTypeRef.current) {
          if (types.includes(desiredTypeRef.current)) {
            setSelectedType(desiredTypeRef.current);
          }
          desiredTypeRef.current = null;
        }
      })
      .catch(err => console.error('读取联动筛选字典失败:', err));
  }, [selectedSubject]);

  // Fetch records
  const fetchRecords = useCallback(async (explicitFilters?: RecordFilter) => {
    setLoading(true);
    try {
      const filter = explicitFilters ?? {
        search: search || undefined,
        subject: selectedSubject || undefined,
        question_type: selectedType || undefined,
        tag: selectedTag || undefined,
      };
      const data = await RecordService.list(filter);
      setRecords(data);
    } catch (err) {
      console.error('抓取档案资产流失败:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedSubject, selectedType, selectedTag]);

  // Handle initialFilters
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      if (initialFilters.subject) setSelectedSubject(initialFilters.subject);
      if (initialFilters.question_type) {
        desiredTypeRef.current = initialFilters.question_type;
        setSelectedType(initialFilters.question_type);
      }
      if (initialFilters.tag) {
        setSelectedTag(initialFilters.tag);
        setSearch(initialFilters.tag);
      }
      fetchRecords({
        subject: initialFilters.subject || undefined,
        question_type: initialFilters.question_type || undefined,
        tag: initialFilters.tag || undefined,
      });
    } else {
      setSearch('');
      setSelectedSubject('');
      setSelectedType('');
      setSelectedTag('');
      fetchRecords({ search: '', subject: '', question_type: '', tag: '' });
    }
  }, [initialFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!activeRecord) return;
    try {
      await RecordService.delete(activeRecord.id);
      alert('🗑️ 档案已删除');
      setActiveRecord(null);
      fetchRecords();
    } catch (err) {
      console.error('删除请求失败', err);
      alert('删除请求失败，请查看控制台');
    }
  };

  return (
    <div className="space-y-5">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        selectedSubject={selectedSubject}
        onSubjectChange={setSelectedSubject}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        dynamicTypes={dynamicTypes}
        onSearch={() => fetchRecords()}
      />

      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400 font-mono tracking-widest animate-pulse">
          ⚡ LOADING ASSETS DATABASE...
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white border border-dashed rounded-2xl py-16 text-center text-xs text-slate-400 space-y-2">
          <p>📭 沙箱检索空域，未能捕获对应的题目切片。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {records.map(record => (
            <RecordCard key={record.id} record={record} onView={setActiveRecord} />
          ))}
        </div>
      )}

      {activeRecord && !showEditForm && (
        <RecordDetail
          record={activeRecord}
          open={!!activeRecord}
          onClose={() => setActiveRecord(null)}
          onEdit={() => setShowEditForm(true)}
          onDelete={handleDelete}
        />
      )}

      {showEditForm && activeRecord && (
        <RecordForm
          record={activeRecord}
          onRecordUpdated={() => {
            fetchRecords();
            setShowEditForm(false);
            setActiveRecord(null);
          }}
          onClose={() => setShowEditForm(false)}
        />
      )}
    </div>
  );
}
