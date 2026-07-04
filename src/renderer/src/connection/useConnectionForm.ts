import { Form } from "antd";
import { useEffect, useState } from "react";
import type { ConnectionProfile } from "@shared/types";
import { joinLines, parseLines } from "@renderer/lib/text";

export type PickFileField =
  | ["tls", "caPath"]
  | ["tls", "certPath"]
  | ["tls", "keyPath"]
  | ["ssh", "privateKeyPath"];

export const useConnectionForm = (initialProfile: ConnectionProfile) => {
  const [form] = Form.useForm<ConnectionProfile>();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const topology = Form.useWatch("topology", form) ?? initialProfile.topology;

  useEffect(() => {
    form.setFieldsValue({
      ...initialProfile,
      clusterNodes: joinLines(initialProfile.clusterNodes) as unknown as string[],
      sentinelNodes: joinLines(initialProfile.sentinelNodes) as unknown as string[]
    } as unknown as ConnectionProfile);
  }, [form, initialProfile]);

  const pickFile = async (field: PickFileField) => {
    const path = await window.api.pickFile();
    if (!path) {
      return;
    }
    form.setFieldValue(field, path);
  };

  const buildProfile = async (): Promise<ConnectionProfile> => {
    const values = await form.validateFields();
    const clusterNodes = parseLines((values as any).clusterNodes ?? "");
    const sentinelNodes = parseLines((values as any).sentinelNodes ?? "");
    return {
      ...initialProfile,
      ...values,
      clusterNodes,
      sentinelNodes
    };
  };

  return {
    form,
    saving,
    testing,
    topology,
    setSaving,
    setTesting,
    pickFile,
    buildProfile
  };
};
