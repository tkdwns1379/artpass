import { useState } from 'react';
import { Modal, Form, Select, Input, message as antMessage } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const REASON_OPTIONS = [
  { label: '욕설 / 비방', value: '욕설/비방' },
  { label: '음란물 / 성적 발언', value: '음란물/성적발언' },
  { label: '스팸 / 도배', value: '스팸/도배' },
  { label: '개인정보 노출', value: '개인정보노출' },
  { label: '혐오 발언', value: '혐오발언' },
  { label: '기타', value: '기타' },
];

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  reportedUserId: string;
  messageContent: string;
  messageType: 'room' | 'dm';
  roomId?: string;
}

export default function ReportModal({ open, onClose, reportedUserId, messageContent, messageType, roomId }: ReportModalProps) {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const values = await form.validateFields();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        message_content: messageContent,
        message_type: messageType,
        room_id: roomId ?? null,
        reason_category: values.category,
        reason_detail: values.detail?.trim() || null,
      });
      if (error) throw new Error(error.message);
      antMessage.success('신고가 접수되었습니다.');
      form.resetFields();
      onClose();
    } catch (e: unknown) {
      antMessage.error((e as Error).message || '신고 접수에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title="신고하기"
      open={open}
      onOk={handleSubmit}
      onCancel={() => { form.resetFields(); onClose(); }}
      okText="신고 접수" cancelText="취소"
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="category" label="신고 사유" rules={[{ required: true, message: '신고 사유를 선택하세요' }]}>
          <Select placeholder="사유 선택" options={REASON_OPTIONS} />
        </Form.Item>
        <Form.Item name="detail" label="상세 내용 (선택)">
          <Input.TextArea rows={3} placeholder="추가 설명을 입력하세요 (선택사항)" maxLength={300} showCount />
        </Form.Item>
        <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 8, fontSize: 12, color: '#666' }}>
          신고 대상 메시지: <span style={{ color: '#333' }}>"{messageContent.slice(0, 60)}{messageContent.length > 60 ? '...' : ''}"</span>
        </div>
      </Form>
    </Modal>
  );
}
