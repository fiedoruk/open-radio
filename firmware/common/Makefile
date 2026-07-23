CXX ?= c++
CXXFLAGS ?= -std=c++17 -Wall -Wextra -Wpedantic -Werror -O2
BUILD_DIR := ../../build/firmware-common
CONTRACT_TARGET := $(BUILD_DIR)/firmware-contract-tests
PARITY_TARGET := $(BUILD_DIR)/service-parity-tests
HOSTILE_TARGET := $(BUILD_DIR)/hostile-input-tests
RUNTIME_TARGET := $(BUILD_DIR)/runtime-orchestrator-tests
INGRESS_TARGET := $(BUILD_DIR)/runtime-ingress-tests
UI_TARGET := $(BUILD_DIR)/ui-controller-tests
BLUETOOTH_PROFILE_TARGET := $(BUILD_DIR)/bluetooth-profile-gate-tests
NOISE_TARGET := $(BUILD_DIR)/local-noise-source-tests
IMAGE_DIMS_TARGET := $(BUILD_DIR)/image-dims-tests
UI_TRACE_TARGET := $(BUILD_DIR)/ui-controller-trace
TARGETS := $(CONTRACT_TARGET) $(PARITY_TARGET) $(HOSTILE_TARGET) $(RUNTIME_TARGET) $(INGRESS_TARGET) $(UI_TARGET) $(BLUETOOTH_PROFILE_TARGET) $(NOISE_TARGET) $(IMAGE_DIMS_TARGET)
INCLUDES := -Iinclude -I../generated

.PHONY: test trace clean

test: $(TARGETS)
	$(CONTRACT_TARGET)
	$(PARITY_TARGET)
	$(HOSTILE_TARGET)
	$(RUNTIME_TARGET)
	$(INGRESS_TARGET)
	$(UI_TARGET)
	$(BLUETOOTH_PROFILE_TARGET)
	$(NOISE_TARGET)
	$(IMAGE_DIMS_TARGET)

$(CONTRACT_TARGET): tests/firmware_contract_tests.cpp include/open_radio/firmware_contract.hpp include/open_radio/spsc_byte_ring.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $< -o $@

$(PARITY_TARGET): tests/service_parity_tests.cpp include/open_radio/service_contracts.hpp include/open_radio/service_adapters.hpp ../generated/service_golden_vectors.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $< -o $@

$(HOSTILE_TARGET): tests/hostile_input_tests.cpp include/open_radio/service_contracts.hpp include/open_radio/service_adapters.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $< -o $@

$(RUNTIME_TARGET): tests/runtime_orchestrator_tests.cpp include/open_radio/runtime_orchestrator.hpp ../generated/runtime_limits.hpp ../generated/runtime_soak_vectors.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $< -o $@

$(INGRESS_TARGET): tests/runtime_ingress_tests.cpp include/open_radio/runtime_ingress.hpp include/open_radio/runtime_service_bridge.hpp ../generated/runtime_ingress_limits.hpp ../generated/runtime_ingress_vectors.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $< -o $@

$(UI_TARGET): tests/ui_controller_tests.cpp include/open_radio/ui_controller.hpp include/open_radio/service_contracts.hpp include/open_radio/service_adapters.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $< -o $@

$(BLUETOOTH_PROFILE_TARGET): tests/bluetooth_profile_gate_tests.cpp include/open_radio/bluetooth_profile_gate.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $< -o $@

$(NOISE_TARGET): tests/local_noise_source_tests.cpp include/open_radio/local_noise_source.hpp include/open_radio/firmware_contract.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $< -o $@

$(IMAGE_DIMS_TARGET): tests/image_dims_tests.cpp include/open_radio/image_dims.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $< -o $@

trace: $(UI_TRACE_TARGET)

$(UI_TRACE_TARGET): tests/ui_controller_trace.cpp include/open_radio/ui_controller.hpp include/open_radio/service_contracts.hpp include/open_radio/service_adapters.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $< -o $@

clean:
	rm -rf $(BUILD_DIR)
