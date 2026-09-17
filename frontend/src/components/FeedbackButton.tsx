import { BugOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal } from 'antd';
import { useState } from 'react';
import { useLocation } from 'react-router';
import { apiErrorMessage, httpClient } from '../providers/axios';
import { useToast } from './Toast';

export function FeedbackButton() {
  const toast = useToast();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ message: string }>();

  const submit = async () => {
    const { message } = await form.validateFields();
    try {
      await httpClient.post('/feedback', { message, page: pathname });
      toast.success('Thanks — IT will see this in the audit log.');
      setOpen(false);
      form.resetFields();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send feedback'));
    }
  };

  return (
    <>
      <Button
        size="small"
        icon={<BugOutlined />}
        onClick={() => setOpen(true)}
        aria-label="Report an issue"
      >
        <span className="nv-header-action-text">Report</span>
      </Button>
      <Modal
        title="Report an issue"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        okText="Send"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="message"
            label="What went wrong?"
            rules={[{ required: true, min: 5, message: 'Please describe the issue' }]}
          >
            <Input.TextArea rows={4} aria-label="Issue description" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
