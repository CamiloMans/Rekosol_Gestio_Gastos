import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Proyecto } from "@/data/mockData";
import { formatDateOnly } from "@/lib/date-format";
import { formatNumericInput, parseNumericInput } from "@/lib/numeric-input";
import { toast } from "@/hooks/use-toast";
import {
  postgresApi,
  type HitoPagoProyecto,
  type HitoPagoProyectoCreateInput,
  type MonedaProyecto,
} from "@/services/postgresApi";
import { Pencil, Search, Trash2 } from "lucide-react";

interface HitoFormState {
  proyectoId: string;
  montoHito: string;
  moneda: MonedaProyecto;
  fechaCompromiso: string;
  fechaPago: string;
  facturado: boolean;
  pagado: boolean;
  observacion: string;
}

const initialForm: HitoFormState = {
  proyectoId: "",
  montoHito: "",
  moneda: "CLP",
  fechaCompromiso: "",
  fechaPago: "",
  facturado: false,
  pagado: false,
  observacion: "",
};

function normalizeObservacion(value: string) {
  return value.toLocaleUpperCase("es-CL");
}

function toDateInputValue(value?: string) {
  if (!value) return "";

  const normalized = value.trim();
  if (!normalized) return "";

  const isoDate = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate?.[1]) return isoDate[1];

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
}

function formatAmount(value: number, moneda: MonedaProyecto) {
  if (moneda === "UF") {
    return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(value)} UF`;
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: moneda === "CLP" ? 0 : 2,
    maximumFractionDigits: moneda === "CLP" ? 0 : 2,
  }).format(value);
}

function statusTag(flag: boolean) {
  return flag ? "SI" : "NO";
}

function sortProjects(items: Proyecto[]) {
  return [...items].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
}

function sortHitos(items: HitoPagoProyecto[]) {
  return [...items].sort((a, b) => {
    if (String(a.proyectoId) !== String(b.proyectoId)) {
      return String(a.proyectoId).localeCompare(String(b.proyectoId));
    }

    return a.nroHito - b.nroHito;
  });
}

export default function ControlPagosHitos() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [hitosPagoProyecto, setHitosPagoProyecto] = useState<HitoPagoProyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHito, setEditingHito] = useState<HitoPagoProyecto | undefined>();
  const [form, setForm] = useState<HitoFormState>(initialForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLockRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [bootstrap, hitos] = await Promise.all([
        postgresApi.getBootstrap(),
        postgresApi.getHitosPagoProyecto(),
      ]);

      setProyectos(sortProjects(bootstrap.proyectos));
      setHitosPagoProyecto(sortHitos(hitos));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar Control de Pagos");
      setProyectos([]);
      setHitosPagoProyecto([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!error) {
      return;
    }

    toast({
      title: "Error",
      description: error,
      variant: "destructive",
    });
  }, [error]);

  const projectMap = useMemo(() => {
    const map = new Map<string, { nombre: string; codigo?: string }>();

    proyectos.forEach((project) => {
      map.set(String(project.id), { nombre: project.nombre, codigo: project.codigoProyecto });
    });

    return map;
  }, [proyectos]);

  const projectByCode = useMemo(() => {
    const map = new Map<string, { nombre: string; id: string }>();

    proyectos.forEach((project) => {
      const code = (project.codigoProyecto || "").trim().toUpperCase();
      if (code) {
        map.set(code, { nombre: project.nombre, id: String(project.id) });
      }
    });

    return map;
  }, [proyectos]);

  const resolveProjectName = useCallback((item: Pick<HitoPagoProyecto, "proyectoId" | "codigoProyecto">) => {
    const byId = projectMap.get(String(item.proyectoId))?.nombre;
    if (byId) return byId;

    const code = (item.codigoProyecto || item.proyectoId || "").trim().toUpperCase();
    const byCode = code ? projectByCode.get(code)?.nombre : undefined;
    if (byCode) return byCode;

    return item.codigoProyecto || "-";
  }, [projectByCode, projectMap]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...hitosPagoProyecto]
      .filter((item) => {
        if (projectFilter !== "all" && String(item.proyectoId) !== String(projectFilter)) return false;
        if (!query) return true;

        const projectName = resolveProjectName(item);
        return (
          String(item.nroHito).includes(query)
          || (item.codigoProyecto || "").toLowerCase().includes(query)
          || projectName.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const projectComparison = resolveProjectName(a).localeCompare(resolveProjectName(b), "es", {
          sensitivity: "base",
        });

        if (projectComparison !== 0) {
          return projectComparison;
        }

        return a.nroHito - b.nroHito;
      });
  }, [hitosPagoProyecto, projectFilter, resolveProjectName, search]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingHito(undefined);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (item: HitoPagoProyecto) => {
    setEditingHito(item);
    setForm({
      proyectoId: String(item.proyectoId),
      montoHito: formatNumericInput(String(item.montoHito), { allowDecimal: true, maxDecimals: 2 }),
      moneda: item.moneda,
      fechaCompromiso: toDateInputValue(item.fechaCompromiso),
      fechaPago: toDateInputValue(item.fechaPago),
      facturado: item.facturado,
      pagado: item.pagado,
      observacion: normalizeObservacion(item.observacion || ""),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;

    saveLockRef.current = true;
    setSaving(true);

    try {
      const project = proyectos.find((item) => String(item.id) === String(form.proyectoId));

      if (!project) {
        toast({
          title: "Proyecto invalido",
          description: "Debes seleccionar un proyecto valido.",
          variant: "destructive",
        });
        return;
      }

      const montoHitoValue = parseNumericInput(form.montoHito, { allowDecimal: true, maxDecimals: 2 });
      if (!Number.isFinite(montoHitoValue) || montoHitoValue <= 0) {
        toast({
          title: "Monto invalido",
          description: "El monto del hito debe ser mayor a 0.",
          variant: "destructive",
        });
        return;
      }

      const payload: HitoPagoProyectoCreateInput = {
        proyectoId: form.proyectoId,
        montoHito: montoHitoValue,
        moneda: form.moneda,
        fechaCompromiso: form.fechaCompromiso,
        fechaPago: form.fechaPago || undefined,
        facturado: form.facturado,
        pagado: form.pagado,
        observacion: normalizeObservacion(form.observacion),
      };

      if (editingHito) {
        const updated = await postgresApi.updateHitoPagoProyecto(editingHito.id, payload);
        setHitosPagoProyecto((prev) =>
          sortHitos(prev.map((item) => (item.id === editingHito.id ? updated : item)))
        );
        toast({
          title: "Hito actualizado",
          description: project.codigoProyecto
            ? `Se actualizo correctamente para ${project.codigoProyecto}.`
            : "Se actualizo correctamente.",
          variant: "success",
        });
      } else {
        const created = await postgresApi.createHitoPagoProyecto(payload);
        setHitosPagoProyecto((prev) => sortHitos([...prev, created]));
        toast({
          title: "Hito creado",
          description: project.codigoProyecto
            ? `Se creo correctamente para ${project.codigoProyecto}.`
            : "Se creo correctamente.",
          variant: "success",
        });
      }

      setModalOpen(false);
      resetForm();
    } catch (saveError) {
      toast({
        title: "Error",
        description: saveError instanceof Error ? saveError.message : "No se pudo guardar el hito",
        variant: "destructive",
      });
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      await postgresApi.deleteHitoPagoProyecto(deleteId);
      setHitosPagoProyecto((prev) => prev.filter((item) => item.id !== deleteId));
      toast({
        title: "Hito eliminado",
        description: "Se elimino correctamente.",
        variant: "success",
      });
    } catch (deleteError) {
      toast({
        title: "Error",
        description: deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el hito",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Control de Pagos - Hitos"
        subtitle={loading ? "Cargando hitos..." : `${filtered.length} hitos`}
        action={{ label: "Nuevo Hito", onClick: openCreateModal }}
      />

      <div className="mb-4 rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        Esta pantalla ya usa PostgreSQL para los registros. Los documentos asociados al hito quedan fuera de esta etapa.
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            placeholder="Buscar por codigo, proyecto o nro hito..."
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="bg-card">
            <SelectValue placeholder="Filtrar por proyecto" />
          </SelectTrigger>
          <SelectContent className="bg-card">
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {proyectos.map((project) => (
              <SelectItem key={project.id} value={String(project.id)}>
                {project.codigoProyecto ? `${project.codigoProyecto} - ${project.nombre}` : project.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>PROYECTO</TableHead>
              <TableHead>NRO HITO</TableHead>
              <TableHead>MONTO HITO</TableHead>
              <TableHead>MONEDA</TableHead>
              <TableHead>FECHA COMPROMISO</TableHead>
              <TableHead>FECHA PAGO</TableHead>
              <TableHead>FACTURADO</TableHead>
              <TableHead>PAGADO</TableHead>
              <TableHead className="text-center">ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{resolveProjectName(item)}</TableCell>
                <TableCell>{item.nroHito}</TableCell>
                <TableCell>{formatAmount(item.montoHito, item.moneda)}</TableCell>
                <TableCell>{item.moneda}</TableCell>
                <TableCell>{formatDateOnly(item.fechaCompromiso)}</TableCell>
                <TableCell>{formatDateOnly(item.fechaPago)}</TableCell>
                <TableCell>{statusTag(item.facturado)}</TableCell>
                <TableCell>{statusTag(item.pagado)}</TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(item)}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No hay hitos para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle>{editingHito ? "Editar Hito" : "Nuevo Hito"}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="proyecto">Proyecto *</Label>
              <Select
                value={form.proyectoId || undefined}
                onValueChange={(value) => setForm((prev) => ({ ...prev, proyectoId: value }))}
                required
              >
                <SelectTrigger id="proyecto" className="bg-card">
                  <SelectValue placeholder="Seleccionar proyecto" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {proyectos.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.codigoProyecto ? `${project.codigoProyecto} - ${project.nombre}` : project.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="montoHito">Monto Hito *</Label>
                <Input
                  id="montoHito"
                  type="text"
                  inputMode="decimal"
                  value={form.montoHito}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      montoHito: formatNumericInput(e.target.value, { allowDecimal: true, maxDecimals: 2 }),
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moneda">Moneda *</Label>
                <Select
                  value={form.moneda}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, moneda: value as MonedaProyecto }))}
                >
                  <SelectTrigger id="moneda" className="bg-card">
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="CLP">CLP</SelectItem>
                    <SelectItem value="UF">UF</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaCompromiso">Fecha Compromiso</Label>
                <Input
                  id="fechaCompromiso"
                  type="date"
                  value={form.fechaCompromiso}
                  onChange={(e) => setForm((prev) => ({ ...prev, fechaCompromiso: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaPago">Fecha Pago</Label>
                <Input
                  id="fechaPago"
                  type="date"
                  value={form.fechaPago}
                  onChange={(e) => setForm((prev) => ({ ...prev, fechaPago: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-md border p-3">
                <Checkbox
                  id="facturado"
                  checked={form.facturado}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, facturado: Boolean(checked) }))}
                />
                <Label htmlFor="facturado" className="cursor-pointer">Facturado</Label>
              </div>

              <div className="flex items-center gap-2 rounded-md border p-3">
                <Checkbox
                  id="pagado"
                  checked={form.pagado}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, pagado: Boolean(checked) }))}
                />
                <Label htmlFor="pagado" className="cursor-pointer">Pagado</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacion">Observacion</Label>
              <Input
                id="observacion"
                value={form.observacion}
                onChange={(e) => setForm((prev) => ({ ...prev, observacion: normalizeObservacion(e.target.value) }))}
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Eliminar hito"
        description="¿Seguro que deseas eliminar este hito? Esta accion no se puede deshacer."
        onConfirm={confirmDelete}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </Layout>
  );
}
