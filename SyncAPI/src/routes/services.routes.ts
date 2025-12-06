import { Router, Request, Response } from 'express';
import servicesService from '../services/services.service';

const router = Router();

// GET /api/services - Get all services
router.get('/', async (req: Request, res: Response) => {
  try {
    const services = await servicesService.getAllServices();
    res.json(services);
  } catch (error) {
    console.error('Error in GET /api/services:', error);
    res.status(500).json({ 
      error: 'Failed to fetch services',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/services/:id - Get service by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await servicesService.getServiceById(id);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    console.error('Error in GET /api/services/:id:', error);
    res.status(500).json({ 
      error: 'Failed to fetch service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/services - Create new service
router.post('/', async (req: Request, res: Response) => {
  try {
    const serviceData = req.body;
    
    // Validate required fields
    if (!serviceData.name || !serviceData.type || !serviceData.configuration) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, type, and configuration are required' 
      });
    }
    
    const newService = await servicesService.createService(serviceData);
    res.status(201).json(newService);
  } catch (error) {
    console.error('Error in POST /api/services:', error);
    const statusCode = error instanceof Error && error.message.includes('already exists') ? 409 : 500;
    res.status(statusCode).json({ 
      error: 'Failed to create service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/services/:id - Update service
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedService = await servicesService.updateService(id, updateData);
    
    if (!updatedService) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(updatedService);
  } catch (error) {
    console.error('Error in PUT /api/services/:id:', error);
    res.status(500).json({ 
      error: 'Failed to update service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/services/:id/toggle - Toggle service enabled status
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Invalid value for enabled field' });
    }
    
    const updatedService = await servicesService.updateService(id, { enabled });
    
    if (!updatedService) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(updatedService);
  } catch (error) {
    console.error('Error in PATCH /api/services/:id/toggle:', error);
    res.status(500).json({ 
      error: 'Failed to toggle service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/services/:id - Delete service
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await servicesService.deleteService(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error in DELETE /api/services/:id:', error);
    res.status(500).json({ 
      error: 'Failed to delete service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router };
