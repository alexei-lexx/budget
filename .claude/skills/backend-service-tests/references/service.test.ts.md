```typescript
describe("WidgetService", () => {
  let mockWidgetRepository: jest.Mocked<WidgetRepository>;
  let mockExternalApiClient: jest.Mocked<ExternalApiClient>;
  let service: WidgetService;

  // Code here...

  beforeEach(() => {
    // Code here...

    mockWidgetRepository = createMockWidgetRepository();
    mockExternalApiClient = createMockExternalApiClient();

    service = new WidgetService({
      mockWidgetRepository,
      mockExternalApiClient,
    });

    // Code here...
  });

  describe("createWidget", () => {
    // Happy path

    it("should create and return a new widget", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const created = fakeWidget();

      // Name is not taken
      mockWidgetRepository.findByName.mockResolvedValue(null);

      // Registration succeeds
      mockExternalApiClient.register.mockResolvedValue({
        success: true,
        data: { externalId: "ext-123" },
      });

      // Persists and returns the new widget
      mockWidgetRepository.create.mockResolvedValue(created);

      // Act
      const result = await service.createWidget(userId, { name: "Foo" });

      // Assert
      expect(result).toEqual({ success: true, data: created });

      expect(mockWidgetRepository.findByName).toHaveBeenCalledWith("Foo");

      expect(mockExternalApiClient.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Foo" }),
      );

      expect(mockWidgetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, externalId: "ext-123" }),
      );
    });

    // Validation failures

    it("should return failure when name is empty", async () => {
      // Arrange
      const userId = faker.string.uuid();

      // Act
      const result = await service.createWidget(userId, { name: "" });

      // Assert
      expect(result).toEqual({ success: false, error: "Name is required" });

      expect(mockWidgetRepository.findByName).not.toHaveBeenCalled();
      expect(mockExternalApiClient.register).not.toHaveBeenCalled();
      expect(mockWidgetRepository.create).not.toHaveBeenCalled();
    });

    it("should return failure when name is already taken", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const existingWidget = fakeWidget();

      // Name is already taken
      mockWidgetRepository.findByName.mockResolvedValue(existingWidget);

      // Act
      const result = await service.createWidget(userId, { name: "Foo" });

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Name is already taken",
      });

      expect(mockWidgetRepository.findByName).toHaveBeenCalledWith("Foo");
      expect(mockExternalApiClient.register).not.toHaveBeenCalled();
      expect(mockWidgetRepository.create).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("should return failure when external API fails", async () => {
      // Arrange
      const userId = faker.string.uuid();

      // Name is not taken
      mockWidgetRepository.findByName.mockResolvedValue(null);

      // Registration fails
      mockExternalApiClient.register.mockResolvedValue({
        success: false,
        error: "Service unavailable",
      });

      // Act
      const result = await service.createWidget(userId, { name: "Foo" });

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Service unavailable",
      });

      expect(mockWidgetRepository.findByName).toHaveBeenCalledWith("Foo");
      expect(mockExternalApiClient.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Foo" }),
      );
      expect(mockWidgetRepository.create).not.toHaveBeenCalled();
    });
  });
});
```
